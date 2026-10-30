from datetime import datetime, timezone
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel

from app.database.session import get_db
from app.models.database import CameraSession
from app.schemas.schemas import CameraSessionCreate, CameraSessionResponse, DetectedFace
from app.computer_vision.tracker import tracker
from app.computer_vision.detector import vision_pipeline

router = APIRouter(prefix="/scanner", tags=["Scanner"])

class FrameProcessRequest(BaseModel):
    image: str
    session_id: int = 1
    camera_label: str = "Browser Camera"

class FrameProcessResponse(BaseModel):
    event: str
    timestamp: str
    fps: float
    active_tracks: int
    faces: List[DetectedFace]

@router.get("/status")
def get_scanner_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    active_session = (
        db.query(CameraSession)
        .filter(CameraSession.status == "ACTIVE")
        .order_by(CameraSession.started_at.desc())
        .first()
    )

    return {
        "is_active": active_session is not None,
        "active_session_id": active_session.id if active_session else None,
        "camera_label": active_session.camera_label if active_session else None,
        "active_tracks_count": len(tracker.tracks),
        "ai_model": "MediaPipe FaceMesh + FACS Expression Classifier",
        "supported_emotions": [
            "Happy", "Sad", "Angry", "Surprised", "Neutral", "Fearful", "Disgusted"
        ],
        "system_status": "Ready"
    }

@router.post("/process-frame", response_model=FrameProcessResponse)
async def process_frame_http(req: FrameProcessRequest):
    """
    HTTP Fallback for face detection and expression classification.
    Ensures 100% reliable functionality when WebSockets are blocked by proxies,
    firewalls, or cloud container constraints.
    """
    frame_bgr = vision_pipeline.decode_frame(req.image)
    if frame_bgr is None:
        return FrameProcessResponse(
            event="frame_error",
            timestamp=datetime.now(timezone.utc).isoformat(),
            fps=0.0,
            active_tracks=len(tracker.tracks),
            faces=[]
        )

    # Run heavy CV pipeline in thread pool to prevent blocking event loop
    loop = asyncio.get_running_loop()
    detected_faces = await loop.run_in_executor(
        None, vision_pipeline.process_frame, frame_bgr, req.session_id
    )

    return FrameProcessResponse(
        event="faces_detected",
        timestamp=datetime.now(timezone.utc).isoformat(),
        fps=10.0,
        active_tracks=len(tracker.tracks),
        faces=detected_faces
    )

@router.post("/session", response_model=CameraSessionResponse)
def start_session(data: CameraSessionCreate, db: Session = Depends(get_db)):
    # Deactivate any previous active sessions
    db.query(CameraSession).filter(CameraSession.status == "ACTIVE").update({
        "status": "STOPPED",
        "ended_at": datetime.now(timezone.utc)
    })

    tracker.reset()

    session = CameraSession(
        camera_label=data.camera_label,
        started_at=datetime.now(timezone.utc),
        status="ACTIVE"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/stop")
def stop_session(db: Session = Depends(get_db)) -> Dict[str, Any]:
    active_sessions = db.query(CameraSession).filter(CameraSession.status == "ACTIVE").all()
    for s in active_sessions:
        s.status = "STOPPED"
        s.ended_at = datetime.now(timezone.utc)
    db.commit()
    tracker.reset()
    return {"message": "Scanner session stopped successfully.", "stopped_sessions": len(active_sessions)}

