from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    participant_code = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    photo_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    consent_status = Column(String(50), default="APPROVED", nullable=False)
    consent_timestamp = Column(DateTime, default=utcnow, nullable=False)
    opt_in_history = Column(Boolean, default=True, nullable=False)

    registrations = relationship("Registration", back_populates="participant", cascade="all, delete-orphan")
    check_ins = relationship("CheckIn", back_populates="participant", cascade="all, delete-orphan")
    expression_events = relationship("ExpressionEvent", back_populates="participant", cascade="all, delete-orphan")

class CameraSession(Base):
    __tablename__ = "camera_sessions"

    id = Column(Integer, primary_key=True, index=True)
    camera_label = Column(String(150), default="Default Camera", nullable=False)
    started_at = Column(DateTime, default=utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)

    expression_events = relationship("ExpressionEvent", back_populates="session", cascade="all, delete-orphan")
    check_ins = relationship("CheckIn", back_populates="session", cascade="all, delete-orphan")

class ExpressionEvent(Base):
    __tablename__ = "expression_events"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="SET NULL"), nullable=True)
    session_id = Column(Integer, ForeignKey("camera_sessions.id", ondelete="CASCADE"), nullable=False)
    expression_label = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=utcnow, nullable=False)
    retention_expires_at = Column(DateTime, nullable=True)

    participant = relationship("Participant", back_populates="expression_events")
    session = relationship("CameraSession", back_populates="expression_events")

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    snapshot_path = Column(String(255), nullable=False)
    registered_at = Column(DateTime, default=utcnow, nullable=False)

    participant = relationship("Participant", back_populates="registrations")

class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("camera_sessions.id", ondelete="CASCADE"), nullable=False)
    checked_in_at = Column(DateTime, default=utcnow, nullable=False)

    participant = relationship("Participant", back_populates="check_ins")
    session = relationship("CameraSession", back_populates="check_ins")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(100), default="default", nullable=False)
    detection_confidence = Column(Float, default=0.6, nullable=False)
    analysis_interval = Column(Integer, default=150, nullable=False)
    save_history = Column(Boolean, default=True, nullable=False)
    retention_days = Column(Integer, default=30, nullable=False)

