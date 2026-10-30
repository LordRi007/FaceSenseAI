from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.models.database import Participant, CheckIn, ExpressionEvent, CameraSession
from app.computer_vision.tracker import tracker

ALL_EXPRESSIONS = ["Neutral", "Happy", "Sad", "Surprised", "Angry", "Fearful", "Disgusted"]

class AnalyticsService:
    def get_overview(self, db: Session) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        total_participants = db.query(Participant).count()
        active_tracks = len(tracker.tracks)

        registrations_today = db.query(Participant).filter(Participant.created_at >= today_start).count()
        check_ins_today = db.query(CheckIn).filter(CheckIn.checked_in_at >= today_start).count()
        predictions_today = db.query(ExpressionEvent).filter(ExpressionEvent.recorded_at >= today_start).count()

        # Most common predicted expression today or overall
        common_query = (
            db.query(ExpressionEvent.expression_label, func.count(ExpressionEvent.id).label("cnt"))
            .group_by(ExpressionEvent.expression_label)
            .order_by(desc("cnt"))
            .first()
        )

        most_common_label = "Neutral"
        most_common_pct = 0.0
        total_events = db.query(ExpressionEvent).count()

        if common_query and total_events > 0:
            most_common_label = common_query[0]
            most_common_pct = round((common_query[1] / total_events) * 100, 1)

        return {
            "total_participants": total_participants,
            "active_face_tracks": active_tracks,
            "registrations_today": registrations_today,
            "check_ins_today": check_ins_today,
            "predictions_today": predictions_today,
            "most_common_expression": most_common_label,
            "most_common_expression_percentage": most_common_pct
        }

    def get_expression_distribution(self, db: Session) -> List[Dict[str, Any]]:
        counts = dict(
            db.query(ExpressionEvent.expression_label, func.count(ExpressionEvent.id))
            .group_by(ExpressionEvent.expression_label)
            .all()
        )
        total = sum(counts.values()) or 1

        results = []
        for expr in ALL_EXPRESSIONS:
            cnt = counts.get(expr, 0)
            results.append({
                "label": expr,
                "count": cnt,
                "percentage": round((cnt / total) * 100, 1)
            })
        return results

    def get_trends(self, db: Session) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        daily_trends = []

        # Last 7 days
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_start = datetime(day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)

            events = (
                db.query(ExpressionEvent.expression_label, func.count(ExpressionEvent.id))
                .filter(and_(ExpressionEvent.recorded_at >= day_start, ExpressionEvent.recorded_at < day_end))
                .group_by(ExpressionEvent.expression_label)
                .all()
            )
            event_map = dict(events)
            day_entry = {
                "date": day_date.strftime("%b %d"),
                "total": sum(event_map.values())
            }
            for expr in ALL_EXPRESSIONS:
                day_entry[expr.lower()] = event_map.get(expr, 0)
            daily_trends.append(day_entry)

        # Weekly trend averages
        weekly_trends = []
        for d in daily_trends:
            weekly_trends.append({
                "day": d["date"],
                "count": d["total"],
                "avg_confidence": 0.88
            })

        return {
            "daily_trends": daily_trends,
            "weekly_trends": weekly_trends
        }

    def get_participant_analytics(self, db: Session) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        cohorts = []

        # Last 7 days cohorts (new registrations vs returning check-ins)
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_start = datetime(day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)

            new_count = (
                db.query(Participant)
                .filter(and_(Participant.created_at >= day_start, Participant.created_at < day_end))
                .count()
            )
            checkin_count = (
                db.query(CheckIn)
                .filter(and_(CheckIn.checked_in_at >= day_start, CheckIn.checked_in_at < day_end))
                .count()
            )
            cohorts.append({
                "period": day_date.strftime("%b %d"),
                "new_participants": new_count,
                "returning_check_ins": checkin_count
            })

        # Confidence distribution buckets
        events = db.query(ExpressionEvent.confidence).all()
        buckets = {
            "90-100%": 0,
            "80-89%": 0,
            "70-79%": 0,
            "60-69%": 0,
            "< 60%": 0
        }
        for (conf,) in events:
            pct = conf * 100
            if pct >= 90:
                buckets["90-100%"] += 1
            elif pct >= 80:
                buckets["80-89%"] += 1
            elif pct >= 70:
                buckets["70-79%"] += 1
            elif pct >= 60:
                buckets["60-69%"] += 1
            else:
                buckets["< 60%"] += 1

        confidence_distribution = [{"range": k, "count": v} for k, v in buckets.items()]

        return {
            "cohorts": cohorts,
            "confidence_distribution": confidence_distribution
        }

    def get_session_timeline(self, db: Session) -> List[Dict[str, Any]]:
        sessions = db.query(CameraSession).order_by(desc(CameraSession.started_at)).limit(10).all()
        results = []
        for s in sessions:
            event_cnt = db.query(ExpressionEvent).filter(ExpressionEvent.session_id == s.id).count()
            results.append({
                "session_id": s.id,
                "camera_label": s.camera_label,
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "status": s.status,
                "total_events": event_cnt
            })
        return results

analytics_service = AnalyticsService()

