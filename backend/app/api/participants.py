import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.database.session import get_db
from app.schemas.schemas import (
    ParticipantCreate,
    ParticipantResponse,
    ParticipantDetailResponse,
    CheckInCreate,
    CheckInResponse
)
from app.services.participant_service import participant_service

router = APIRouter(prefix="/participants", tags=["Participants"])

@router.get("", response_model=Dict[str, Any])
def list_participants(
    search: Optional[str] = Query(None, description="Search by name or code"),
    sort_by: str = Query("newest", description="newest, oldest, name, code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    participants, total = participant_service.list_participants(
        db, search=search, sort_by=sort_by, skip=skip, limit=limit
    )
    return {
        "items": participants,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("", response_model=Dict[str, Any])
def register_participant(data: ParticipantCreate, db: Session = Depends(get_db)):
    success, participant, message = participant_service.register_participant(db, data)
    if not success or not participant:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "participant": {
            "id": participant.id,
            "participant_code": participant.participant_code,
            "display_name": participant.display_name,
            "photo_path": participant.photo_path,
            "consent_status": participant.consent_status,
            "created_at": participant.created_at
        }
    }

@router.get("/{id}", response_model=Dict[str, Any])
def get_participant_detail(id: int, db: Session = Depends(get_db)):
    data = participant_service.get_participant_detail(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Participant not found")
    return data

@router.delete("/{id}")
def delete_participant(id: int, db: Session = Depends(get_db)):
    success, message = participant_service.delete_participant(db, id)
    if not success:
        raise HTTPException(status_code=404, detail=message)
    return {"success": True, "message": message}

@router.post("/{id}/check-in", response_model=Dict[str, Any])
def check_in_participant(id: int, data: CheckInCreate, db: Session = Depends(get_db)):
    session_id = data.session_id or 1
    success, check_in, message = participant_service.check_in_participant(
        db, participant_id=id, session_id=session_id, session_tracking_id=data.session_tracking_id
    )
    if not success or not check_in:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "check_in": {
            "id": check_in.id,
            "participant_id": check_in.participant_id,
            "session_id": check_in.session_id,
            "checked_in_at": check_in.checked_in_at
        }
    }

@router.get("/{id}/export")
def export_participant_data(
    id: int,
    format: str = Query("json", description="json or csv"),
    db: Session = Depends(get_db)
):
    data = participant_service.get_participant_detail(db, id)
    if not data:
        raise HTTPException(status_code=404, detail="Participant not found")

    filename_base = f"participant_{data['participant_code']}_export"

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["Participant ID", data["id"]])
        writer.writerow(["Participant Code", data["participant_code"]])
        writer.writerow(["Display Name", data["display_name"] or "Anonymous"])
        writer.writerow(["Consent Status", data["consent_status"]])
        writer.writerow(["Registered At", data["created_at"]])
        writer.writerow(["Opt-In History", data["opt_in_history"]])
        writer.writerow([])
        writer.writerow(["Check-In Timestamp", "Session ID"])
        for c in data.get("check_ins", []):
            writer.writerow([c.get("checked_in_at"), c.get("session_id")])
        writer.writerow([])
        writer.writerow(["Expression History Recorded At", "Expression", "Confidence"])
        for e in data.get("expression_history", []):
            writer.writerow([e.get("recorded_at"), e.get("expression_label"), f"{round(e.get('confidence', 0.0) * 100, 1)}%"])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.csv"}
        )
    else:
        # Convert non-serializable objects
        serializable_data = {
            "participant_code": data["participant_code"],
            "display_name": data["display_name"],
            "photo_path": data["photo_path"],
            "consent_status": data["consent_status"],
            "created_at": str(data["created_at"]),
            "opt_in_history": data["opt_in_history"],
            "check_ins": [
                {"id": c.get("id"), "session_id": c.get("session_id"), "checked_in_at": str(c.get("checked_in_at"))}
                for c in data.get("check_ins", [])
            ],
            "expression_history": [
                {
                    "id": e.get("id"),
                    "expression": e.get("expression_label"),
                    "confidence": e.get("confidence"),
                    "recorded_at": str(e.get("recorded_at"))
                }
                for e in data.get("expression_history", [])
            ]
        }
        json_content = json.dumps(serializable_data, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.json"}
        )
