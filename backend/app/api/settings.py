from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.database import Setting
from app.schemas.schemas import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            camera_id="default",
            detection_confidence=0.6,
            analysis_interval=150,
            save_history=True,
            retention_days=30
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting()
        db.add(setting)

    if data.camera_id is not None:
        setting.camera_id = data.camera_id
    if data.detection_confidence is not None:
        setting.detection_confidence = data.detection_confidence
    if data.analysis_interval is not None:
        setting.analysis_interval = data.analysis_interval
    if data.save_history is not None:
        setting.save_history = data.save_history
    if data.retention_days is not None:
        setting.retention_days = data.retention_days

    db.commit()
    db.refresh(setting)
    return setting

