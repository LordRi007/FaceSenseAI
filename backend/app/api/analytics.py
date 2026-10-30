from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.database.session import get_db
from app.models.database import ExpressionEvent
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    return analytics_service.get_overview(db)

@router.get("/expressions")
def get_expressions(db: Session = Depends(get_db)):
    return analytics_service.get_expression_distribution(db)

@router.get("/trends")
def get_trends(db: Session = Depends(get_db)):
    return analytics_service.get_trends(db)

@router.get("/participants")
def get_participants(db: Session = Depends(get_db)):
    return analytics_service.get_participant_analytics(db)

@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return analytics_service.get_session_timeline(db)

@router.get("/history")
def get_history(
    expression: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(ExpressionEvent).order_by(ExpressionEvent.recorded_at.desc())
    if expression:
        query = query.filter(ExpressionEvent.expression_label.ilike(expression))

    total = query.count()
    events = query.offset(skip).limit(limit).all()

    return {
        "items": [
            {
                "id": e.id,
                "participant_id": e.participant_id,
                "session_id": e.session_id,
                "expression_label": e.expression_label,
                "confidence": round(e.confidence, 3),
                "recorded_at": e.recorded_at
            }
            for e in events
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }

