from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database.session import get_db
from app.models.database import CameraSession
from app.schemas.schemas import CameraSessionCreate, CameraSessionResponse
from app.computer_vision.tracker import tracker

router = APIRouter(prefix="/scanner", tags=["Scanner"])

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

