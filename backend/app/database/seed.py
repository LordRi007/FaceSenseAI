import os
import cv2
import numpy as np
from datetime import datetime, timedelta, timezone
from app.database.session import SessionLocal, init_db
from app.models.database import Participant, Registration, CheckIn, ExpressionEvent, Setting, CameraSession

SNAPSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "snapshots"))
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

def generate_avatar_image(filename: str, color: tuple, initials: str):
    img = np.zeros((240, 240, 3), dtype=np.uint8)
    # Background gradient
    for y in range(240):
        factor = 0.7 + 0.3 * (y / 240.0)
        img[y, :] = [int(c * factor) for c in color]

    # Draw stylish face silhouette
    cv2.circle(img, (120, 95), 55, (235, 235, 245), -1)
    cv2.ellipse(img, (120, 215), (85, 65), 0, 0, 360, (235, 235, 245), -1)

    # Initials
    font = cv2.FONT_HERSHEY_DUPLEX
    text_size = cv2.getTextSize(initials, font, 1.1, 2)[0]
    tx = (240 - text_size[0]) // 2
    ty = 105
    cv2.putText(img, initials, (tx, ty), font, 1.1, (40, 45, 65), 2, cv2.LINE_AA)

    path = os.path.join(SNAPSHOT_DIR, filename)
    cv2.imwrite(path, img)
    return f"/storage/snapshots/{filename}"

def seed_database():
    init_db()
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # Seed Settings
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

        # Ensure active Camera Session exists
        session = db.query(CameraSession).filter_by(status="ACTIVE").first()
        if not session:
            session = CameraSession(
                camera_label="Integrated HD Webcam",
                started_at=now - timedelta(hours=3),
                status="ACTIVE"
            )
            db.add(session)
            db.flush()

        # Seed pre-registered user 'seak' if snapshot exists
        seak_photo = os.path.join(SNAPSHOT_DIR, "P00007_1793347640.jpg")
        if os.path.exists(seak_photo) and not db.query(Participant).filter_by(participant_code="P00007").first():
            p_seak = Participant(
                participant_code="P00007",
                display_name="seak",
                photo_path="/storage/snapshots/P00007_1793347640.jpg",
                created_at=now,
                updated_at=now,
                consent_status="APPROVED",
                consent_timestamp=now,
                opt_in_history=True
            )
            db.add(p_seak)
            db.flush()
            db.add(Registration(
                participant_id=p_seak.id,
                snapshot_path="/storage/snapshots/P00007_1793347640.jpg",
                registered_at=now
            ))
            db.commit()
            print("[Seed] Seeded participant seak (P00007)")

        if db.query(Participant).count() > 1:
            print("[Seed] Participants already exist. Skipping base seed.")
            return

        # Seed Participants
        participants_data = [
            ("P00001", "Alex Morgan", (220, 100, 70), "AM", "Happy", 0.94),
            ("P00002", "Elena Rostova", (80, 180, 100), "ER", "Neutral", 0.89),
            ("P00003", "David Chen", (100, 120, 230), "DC", "Surprised", 0.92),
            ("P00004", "Sophia Patel", (180, 80, 200), "SP", "Happy", 0.88),
            ("P00005", "Marcus Vance", (60, 140, 220), "MV", "Sad", 0.82),
        ]

        for idx, (code, name, color, initials, initial_expr, conf) in enumerate(participants_data):
            photo_path = generate_avatar_image(f"{code}_avatar.jpg", color, initials)
            created_time = now - timedelta(days=idx, hours=idx * 2)

            p = Participant(
                participant_code=code,
                display_name=name,
                photo_path=photo_path,
                created_at=created_time,
                updated_at=created_time,
                consent_status="APPROVED",
                consent_timestamp=created_time,
                opt_in_history=True
            )
            db.add(p)
            db.flush()

            # Registration
            reg = Registration(
                participant_id=p.id,
                snapshot_path=photo_path,
                registered_at=created_time
            )
            db.add(reg)

            # Check-ins
            for c_idx in range(idx + 1):
                check_in_time = created_time + timedelta(hours=c_idx * 4)
                db.add(CheckIn(
                    participant_id=p.id,
                    session_id=session.id,
                    checked_in_at=check_in_time
                ))

            # Expression events
            expressions = [initial_expr, "Neutral", "Happy", "Surprised", "Neutral"]
            for e_idx, expr in enumerate(expressions):
                event_time = created_time + timedelta(minutes=e_idx * 15)
                db.add(ExpressionEvent(
                    participant_id=p.id,
                    session_id=session.id,
                    expression_label=expr,
                    confidence=round(conf - (e_idx * 0.02), 2),
                    recorded_at=event_time
                ))

        # Add some historical events over past 7 days for rich analytics
        demo_emotions = ["Happy", "Neutral", "Surprised", "Sad", "Angry", "Fearful", "Disgusted"]
        for d in range(7):
            day_time = now - timedelta(days=d)
            for k in range(12):
                db.add(ExpressionEvent(
                    participant_id=1,
                    session_id=session.id,
                    expression_label=demo_emotions[(d + k) % len(demo_emotions)],
                    confidence=round(0.75 + (k % 5) * 0.04, 2),
                    recorded_at=day_time - timedelta(hours=k)
                ))

        db.commit()
        print(f"[Seed] Successfully seeded {len(participants_data)} participants and historical analytics.")
    except Exception as e:
        print(f"[Seed] Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

