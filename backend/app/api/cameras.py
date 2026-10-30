from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.database import CameraSession

router = APIRouter(prefix="/cameras", tags=["Cameras"])

@router.get("", response_model=List[Dict[str, Any]])
def list_cameras(db: Session = Depends(get_db)):
    """
    Returns known camera profiles and active camera sessions.
    The frontend directly enumerates local hardware devices via WebRTC MediaDevices API.
    """
    sessions = db.query(CameraSession).order_by(CameraSession.started_at.desc()).limit(5).all()
    camera_labels = list({s.camera_label for s in sessions if s.camera_label})
    if not camera_labels:
        camera_labels = ["Integrated HD Webcam", "External USB Camera"]

    return [
        {
            "id": f"cam_{i+1}",
            "label": label,
            "status": "available",
            "supported_resolutions": ["1920x1080", "1280x720", "640x480"],
            "target_fps": 30
        }
        for i, label in enumerate(camera_labels)
    ]

