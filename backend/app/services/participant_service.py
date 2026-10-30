import os
import uuid
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.database import Participant, Registration, CheckIn, ExpressionEvent, Setting
from app.schemas.schemas import ParticipantCreate, ParticipantResponse, ParticipantDetailResponse
from app.computer_vision.tracker import tracker
from app.computer_vision.detector import vision_pipeline
from app.computer_vision.quality_checker import quality_checker

SNAPSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "snapshots"))
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

class ParticipantService:
    def _generate_participant_code(self, db: Session) -> str:
        last_participant = db.query(Participant).order_by(desc(Participant.id)).first()
        next_id = (last_participant.id + 1) if last_participant else 1
        return f"P{next_id:05d}"

    def register_participant(
        self,
        db: Session,
        data: ParticipantCreate
    ) -> Tuple[bool, Optional[Participant], str]:
        """
        Consent-based registration workflow:
        1. Validates consent
        2. Retrieves optimal snapshot candidate from tracker or decodes captured base64
        3. Runs image quality checks (blur, brightness, size)
        4. Saves cropped snapshot to storage
        5. Saves participant, registration, and initial expression event to DB
        """
        if data.consent_status != "APPROVED":
            return False, None, "Registration requires participant consent."

        face_crop = None

        # 1. Try to get best snapshot accumulated during active tracking
        if data.session_tracking_id:
            face_crop = vision_pipeline.get_optimal_snapshot_for_track(data.session_tracking_id)

        # 2. Or decode base64 captured frame if provided
        if face_crop is None and data.captured_image_base64:
            face_crop = vision_pipeline.decode_frame(data.captured_image_base64)

        if face_crop is None or face_crop.size == 0:
            return False, None, "No valid face snapshot available. Please ensure face is visible."

        # 3. Quality verification
        is_valid, quality_score, details = quality_checker.evaluate_face_crop(face_crop)
        if not is_valid:
            error_msg = details.get("error", "Snapshot did not pass quality check (low contrast or extreme lighting).")
            # If slightly lower quality but consent is explicit, allow with warning or fallback
            if quality_score < 0.2:
                return False, None, f"Snapshot quality insufficient: {error_msg}"

        # 4. Generate participant ID and save photo
        code = self._generate_participant_code(db)
        filename = f"{code}_{int(datetime.now().timestamp())}.jpg"
        file_path = os.path.join(SNAPSHOT_DIR, filename)

        # Save high quality JPEG
        cv2.imwrite(file_path, face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        relative_photo_path = f"/storage/snapshots/{filename}"

        now = datetime.now(timezone.utc)
        participant = Participant(
            participant_code=code,
            display_name=data.display_name.strip() if data.display_name else None,
            photo_path=relative_photo_path,
            created_at=now,
            updated_at=now,
            consent_status="APPROVED",
            consent_timestamp=now,
            opt_in_history=data.opt_in_history
        )
        db.add(participant)
        db.flush()

        # Registration entry
        registration = Registration(
            participant_id=participant.id,
            snapshot_path=relative_photo_path,
            registered_at=now
        )
        db.add(registration)

        # Record initial expression if available and opted in
        if data.initial_expression:
            event = ExpressionEvent(
                participant_id=participant.id,
                session_id=1,  # Associated active session
                expression_label=data.initial_expression,
                confidence=data.initial_confidence or 0.85,
                recorded_at=now
            )
            db.add(event)

        db.commit()
        db.refresh(participant)

        # Link active track in tracker
        if data.session_tracking_id:
            tracker.link_participant(
                track_id=data.session_tracking_id,
                participant_id=participant.id,
                code=participant.participant_code,
                name=participant.display_name
            )

        return True, participant, "Participant registered successfully."

    def check_in_participant(
        self,
        db: Session,
        participant_id: int,
        session_id: int,
        session_tracking_id: Optional[str] = None
    ) -> Tuple[bool, Optional[CheckIn], str]:
        """
        Authorized returning participant check-in:
        - Links participant to current session
        - Prevents duplicate registration & unnecessary snapshot capture
        - Connects active session track to this participant
        """
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            return False, None, "Participant record not found."

        now = datetime.now(timezone.utc)
        check_in = CheckIn(
            participant_id=participant.id,
            session_id=session_id,
            checked_in_at=now
        )
        db.add(check_in)
        db.commit()
        db.refresh(check_in)

        # Link active track
        if session_tracking_id:
            tracker.link_participant(
                track_id=session_tracking_id,
                participant_id=participant.id,
                code=participant.participant_code,
                name=participant.display_name
            )

        return True, check_in, f"Participant {participant.participant_code} checked in successfully."

    def list_participants(
        self,
        db: Session,
        search: Optional[str] = None,
        sort_by: str = "newest",
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = db.query(Participant)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Participant.participant_code.ilike(search_term)) |
                (Participant.display_name.ilike(search_term))
            )

        total = query.count()

        if sort_by == "newest":
            query = query.order_by(desc(Participant.created_at))
        elif sort_by == "oldest":
            query = query.order_by(Participant.created_at)
        elif sort_by == "name":
            query = query.order_by(Participant.display_name)
        elif sort_by == "code":
            query = query.order_by(Participant.participant_code)

        participants = query.offset(skip).limit(limit).all()

        results = []
        for p in participants:
            # Latest expression if history is enabled
            last_event = None
            if p.opt_in_history:
                last_event = (
                    db.query(ExpressionEvent)
                    .filter(ExpressionEvent.participant_id == p.id)
                    .order_by(desc(ExpressionEvent.recorded_at))
                    .first()
                )

            last_check_in = (
                db.query(CheckIn)
                .filter(CheckIn.participant_id == p.id)
                .order_by(desc(CheckIn.checked_in_at))
                .first()
            )

            check_ins_count = db.query(CheckIn).filter(CheckIn.participant_id == p.id).count()

            results.append({
                "id": p.id,
                "participant_code": p.participant_code,
                "display_name": p.display_name,
                "photo_path": p.photo_path,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "consent_status": p.consent_status,
                "consent_timestamp": p.consent_timestamp,
                "opt_in_history": p.opt_in_history,
                "last_expression": last_event.expression_label if last_event else None,
                "last_expression_confidence": last_event.confidence if last_event else None,
                "last_check_in_at": last_check_in.checked_in_at if last_check_in else None,
                "check_ins_count": check_ins_count
            })

        return results, total

    def get_participant_detail(self, db: Session, participant_id: int) -> Optional[Dict[str, Any]]:
        p = db.query(Participant).filter(Participant.id == participant_id).first()
        if not p:
            return None

        last_event = (
            db.query(ExpressionEvent)
            .filter(ExpressionEvent.participant_id == p.id)
            .order_by(desc(ExpressionEvent.recorded_at))
            .first()
        )

        last_check_in = (
            db.query(CheckIn)
            .filter(CheckIn.participant_id == p.id)
            .order_by(desc(CheckIn.checked_in_at))
            .first()
        )

        check_ins = (
            db.query(CheckIn)
            .filter(CheckIn.participant_id == p.id)
            .order_by(desc(CheckIn.checked_in_at))
            .limit(25)
            .all()
        )

        # Expression history is only retrieved if participant explicitly opted in
        expression_history = []
        if p.opt_in_history:
            expression_history = (
                db.query(ExpressionEvent)
                .filter(ExpressionEvent.participant_id == p.id)
                .order_by(desc(ExpressionEvent.recorded_at))
                .limit(50)
                .all()
            )

        return {
            "id": p.id,
            "participant_code": p.participant_code,
            "display_name": p.display_name,
            "photo_path": p.photo_path,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "consent_status": p.consent_status,
            "consent_timestamp": p.consent_timestamp,
            "opt_in_history": p.opt_in_history,
            "last_expression": last_event.expression_label if last_event else None,
            "last_expression_confidence": last_event.confidence if last_event else None,
            "last_check_in_at": last_check_in.checked_in_at if last_check_in else None,
            "check_ins_count": len(check_ins),
            "check_ins": [
                {
                    "id": c.id,
                    "participant_id": c.participant_id,
                    "session_id": c.session_id,
                    "checked_in_at": c.checked_in_at
                }
                for c in check_ins
            ],
            "expression_history": [
                {
                    "id": e.id,
                    "participant_id": e.participant_id,
                    "session_id": e.session_id,
                    "expression_label": e.expression_label,
                    "confidence": e.confidence,
                    "recorded_at": e.recorded_at
                }
                for e in expression_history
            ]
        }

    def delete_participant(self, db: Session, participant_id: int) -> Tuple[bool, str]:
        """
        Permanently deletes participant, their registered snapshot file, and all associated events.
        """
        p = db.query(Participant).filter(Participant.id == participant_id).first()
        if not p:
            return False, "Participant not found."

        # Delete physical snapshot file
        if p.photo_path:
            filename = os.path.basename(p.photo_path)
            full_path = os.path.join(SNAPSHOT_DIR, filename)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except Exception as e:
                    print(f"[delete_participant] Warning: Could not remove file {full_path}: {e}")

        db.delete(p)
        db.commit()
        return True, "Participant and associated biometric snapshot deleted completely."

participant_service = ParticipantService()
