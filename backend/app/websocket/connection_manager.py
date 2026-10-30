import asyncio
import json
import time
from typing import List, Set, Dict
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.computer_vision.detector import vision_pipeline
from app.models.database import ExpressionEvent, Setting, Participant
from app.computer_vision.tracker import tracker

class ScannerWebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.last_db_save_per_participant: Dict[int, float] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def handle_stream(self, websocket: WebSocket):
        last_frame_time = time.time()
        fps = 0.0
        loop = asyncio.get_running_loop()

        try:
            while True:
                # Support both text (JSON with base64) and binary JPEG frames
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    break

                frame_data = None
                session_id = 1
                camera_label = "Browser Camera"

                if "text" in message:
                    try:
                        payload = json.loads(message["text"])
                        frame_data = payload.get("image")
                        session_id = payload.get("session_id", 1)
                        camera_label = payload.get("camera_label", "Browser Camera")
                    except Exception:
                        frame_data = message["text"]
                elif "bytes" in message:
                    frame_data = message["bytes"]

                if not frame_data:
                    continue

                # Measure live FPS
                curr_time = time.time()
                dt = curr_time - last_frame_time
                if dt > 0:
                    fps = round(1.0 / dt, 1)
                last_frame_time = curr_time

                # Offload frame decoding and computer vision processing to thread pool
                # to prevent blocking the Uvicorn asyncio event loop
                frame_bgr = await loop.run_in_executor(
                    None, vision_pipeline.decode_frame, frame_data
                )

                if frame_bgr is not None:
                    detected_faces = []
                    try:
                        detected_faces = await loop.run_in_executor(
                            None, vision_pipeline.process_frame, frame_bgr, session_id
                        )
                    except Exception as cv_err:
                        print(f"[WebSocket] Vision process error: {cv_err}")

                    # Persist expression events in DB for registered participants who opted in
                    # Throttled to max 1 write every 3 seconds per participant
                    if detected_faces:
                        now = time.time()
                        faces_to_record = [
                            f for f in detected_faces
                            if f.participant_id and f.expression != "Uncertain"
                            and (now - self.last_db_save_per_participant.get(f.participant_id, 0)) >= 3.0
                        ]

                        if faces_to_record:
                            try:
                                def _save_events(records):
                                    db: Session = SessionLocal()
                                    try:
                                        setting = db.query(Setting).first()
                                        if setting and not setting.save_history:
                                            return
                                        for f in records:
                                            p = db.query(Participant).filter(Participant.id == f.participant_id).first()
                                            if p and p.opt_in_history:
                                                event = ExpressionEvent(
                                                    participant_id=p.id,
                                                    session_id=session_id,
                                                    expression_label=f.expression,
                                                    confidence=f.confidence
                                                )
                                                db.add(event)
                                                self.last_db_save_per_participant[f.participant_id] = now
                                        db.commit()
                                    finally:
                                        db.close()

                                await loop.run_in_executor(None, _save_events, faces_to_record)
                            except Exception:
                                pass

                    response_payload = {
                        "event": "faces_detected",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "fps": fps,
                        "active_tracks": len(tracker.tracks),
                        "faces": [face.model_dump() for face in detected_faces]
                    }

                    await websocket.send_text(json.dumps(response_payload))
                else:
                    await websocket.send_text(json.dumps({
                        "event": "frame_error",
                        "error": "Failed to decode frame",
                        "faces": [],
                        "active_tracks": 0
                    }))

        except WebSocketDisconnect:
            print("[WebSocket] Client disconnected cleanly.")
            self.disconnect(websocket)
        except Exception as e:
            import traceback
            print(f"[WebSocket] Stream error: {e}")
            traceback.print_exc()
            self.disconnect(websocket)

ws_manager = ScannerWebSocketManager()

