from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Bounding Box & AI Detections -----------------

class BoundingBox(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0.0 to 1.0)")
    y: float = Field(..., description="Normalized Y coordinate (0.0 to 1.0)")
    width: float = Field(..., description="Normalized width (0.0 to 1.0)")
    height: float = Field(..., description="Normalized height (0.0 to 1.0)")

class FaceLandmarkPoint(BaseModel):
    x: float
    y: float

class DetectedFace(BaseModel):
    session_tracking_id: str
    participant_id: Optional[int] = None
    participant_code: Optional[str] = None
    display_name: Optional[str] = None
    is_registered: bool = False
    expression: str
    confidence: float
    all_scores: Dict[str, float] = {}
    bounding_box: BoundingBox
    status: str = "Tracking"
    quality_score: float = 1.0
    brightness_ok: bool = True
    blur_ok: bool = True
    size_ok: bool = True

class AnalysisFrameResponse(BaseModel):
    event: str = "faces_detected"
    timestamp: str
    faces: List[DetectedFace]
    active_tracks: int
    fps: float = 0.0

# ----------------- Participants -----------------

class ParticipantCreate(BaseModel):
    display_name: Optional[str] = None
    consent_status: str = "APPROVED"
    opt_in_history: bool = True
    session_tracking_id: Optional[str] = None
    captured_image_base64: Optional[str] = None
    initial_expression: Optional[str] = None
    initial_confidence: Optional[float] = None

class ParticipantResponse(BaseModel):
    id: int
    participant_code: str
    display_name: Optional[str] = None
    photo_path: str
    created_at: datetime
    updated_at: datetime
    consent_status: str
    consent_timestamp: datetime
    opt_in_history: bool
    last_expression: Optional[str] = None
    last_expression_confidence: Optional[float] = None
    last_check_in_at: Optional[datetime] = None
    check_ins_count: int = 0

    model_config = {"from_attributes": True}

class CheckInResponse(BaseModel):
    id: int
    participant_id: int
    session_id: int
    checked_in_at: datetime

    model_config = {"from_attributes": True}

class CheckInCreate(BaseModel):
    session_id: Optional[int] = None
    camera_label: Optional[str] = None
    session_tracking_id: Optional[str] = None

class ExpressionEventResponse(BaseModel):
    id: int
    participant_id: Optional[int] = None
    session_id: int
    expression_label: str
    confidence: float
    recorded_at: datetime

    model_config = {"from_attributes": True}

class ParticipantDetailResponse(ParticipantResponse):
    check_ins: List[CheckInResponse] = []
    expression_history: List[ExpressionEventResponse] = []

# ----------------- Camera Sessions -----------------

class CameraSessionCreate(BaseModel):
    camera_label: str = "Default Camera"

class CameraSessionResponse(BaseModel):
    id: int
    camera_label: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str

    model_config = {"from_attributes": True}

# ----------------- Settings -----------------

class SettingsUpdate(BaseModel):
    camera_id: Optional[str] = None
    detection_confidence: Optional[float] = None
    analysis_interval: Optional[int] = None
    save_history: Optional[bool] = None
    retention_days: Optional[int] = None

class SettingsResponse(BaseModel):
    id: int
    camera_id: str
    detection_confidence: float
    analysis_interval: int
    save_history: bool
    retention_days: int

    model_config = {"from_attributes": True}

# ----------------- Analytics -----------------

class AnalyticsOverview(BaseModel):
    total_participants: int
    active_face_tracks: int
    registrations_today: int
    check_ins_today: int
    predictions_today: int
    most_common_expression: str
    most_common_expression_percentage: float

class ExpressionCount(BaseModel):
    label: str
    count: int
    percentage: float

class DailyTrend(BaseModel):
    date: str
    happy: int = 0
    sad: int = 0
    angry: int = 0
    surprised: int = 0
    neutral: int = 0
    fearful: int = 0
    disgusted: int = 0
    total: int = 0

class WeeklyTrend(BaseModel):
    day: str
    count: int
    avg_confidence: float

class ParticipantCohort(BaseModel):
    period: str
    new_participants: int
    returning_check_ins: int

class ConfidenceBucket(BaseModel):
    range: str
    count: int

class SessionTimelineItem(BaseModel):
    session_id: int
    camera_label: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str
    total_events: int
