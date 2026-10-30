import json
import time
from typing import List, Set
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.computer_vision.detector import vision_pipeline
from app.models.database import ExpressionEvent, Setting, Participant
from app.computer_vision.tracker import tracker

class ScannerWebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def handle_stream(self, websocket: WebSocket):
        last_frame_time = time.time()
        fps = 0.0

        try:
            while True:
                # Support both text (JSON with base64) and binary JPEG frames
                message = await websocket.receive()

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

                # Process frame with Computer Vision pipeline
                frame_bgr = vision_pipeline.decode_frame(frame_data)
                if frame_bgr is not None:
                    detected_faces = vision_pipeline.process_frame(frame_bgr, session_id=session_id)

                    # Persist expression events in DB for registered participants who opted in
                    # and throttle event persistence to avoid flooding DB (e.g. 1 per second per participant)
                    try:
                        db: Session = SessionLocal()
                        setting = db.query(Setting).first()
                        save_history = setting.save_history if setting else True

                        if save_history:
                            for face in detected_faces:
                                if face.participant_id and face.expression != "Uncertain":
                                    p = db.query(Participant).filter(Participant.id == face.participant_id).first()
                                    if p and p.opt_in_history:
                                        # Record expression event
                                        event = ExpressionEvent(
                                            participant_id=p.id,
                                            session_id=session_id,
                                            expression_label=face.expression,
                                            confidence=face.confidence
                                        )
                                        db.add(event)
                                        db.commit()
                        db.close()
                    except Exception as e:
                        # Non-blocking db error in stream
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
            self.disconnect(websocket)
        except Exception as e:
            self.disconnect(websocket)

ws_manager = ScannerWebSocketManager()

