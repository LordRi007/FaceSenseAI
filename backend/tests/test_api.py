import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    if "text/html" in response.headers.get("content-type", ""):
        assert "FaceSense" in response.text
    else:
        data = response.json()
        assert data["system"] == "FaceSense AI"

def test_api_info_endpoint():
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "FaceSense AI"
    assert "disclaimer" in data

def test_scanner_status():
    response = client.get("/api/scanner/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_active" in data
    assert "supported_emotions" in data
    assert len(data["supported_emotions"]) == 7

def test_consent_handling_rejected_without_consent():
    payload = {
        "display_name": "Test User",
        "consent_status": "DENIED",
        "captured_image_base64": None
    }
    response = client.post("/api/participants", json=payload)
    assert response.status_code == 400
    assert "consent" in response.json()["detail"].lower()

def test_registration_and_deletion_lifecycle():
    # 1. Register with a small valid 100x100 white face test image
    import base64
    import cv2
    import numpy as np

    img = np.full((120, 120, 3), 150, dtype=np.uint8)
    cv2.circle(img, (60, 60), 40, (200, 200, 200), -1)
    _, buf = cv2.imencode(".jpg", img)
    b64 = base64.b64encode(buf).decode("utf-8")

    payload = {
        "display_name": "Automated Test Participant",
        "consent_status": "APPROVED",
        "opt_in_history": True,
        "captured_image_base64": b64,
        "initial_expression": "Happy",
        "initial_confidence": 0.91
    }
    reg_res = client.post("/api/participants", json=payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    p_id = reg_data["participant"]["id"]
    p_code = reg_data["participant"]["participant_code"]
    assert p_code.startswith("P")

    # 2. Returning participant check-in
    checkin_payload = {"session_id": 1}
    checkin_res = client.post(f"/api/participants/{p_id}/check-in", json=checkin_payload)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["success"] is True

    # 3. Retrieve details
    detail_res = client.get(f"/api/participants/{p_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == p_id
    assert len(detail_data["check_ins"]) >= 1

    # 4. Data export (JSON and CSV)
    export_json = client.get(f"/api/participants/{p_id}/export?format=json")
    assert export_json.status_code == 200
    export_csv = client.get(f"/api/participants/{p_id}/export?format=csv")
    assert export_csv.status_code == 200

    # 5. Delete participant
    del_res = client.delete(f"/api/participants/{p_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify deleted
    get_after_del = client.get(f"/api/participants/{p_id}")
    assert get_after_del.status_code == 404

def test_analytics_endpoints():
    res_overview = client.get("/api/analytics/overview")
    assert res_overview.status_code == 200
    assert "total_participants" in res_overview.json()

    res_expr = client.get("/api/analytics/expressions")
    assert res_expr.status_code == 200
    assert isinstance(res_expr.json(), list)

    res_trends = client.get("/api/analytics/trends")
    assert res_trends.status_code == 200
    assert "daily_trends" in res_trends.json()

    res_settings = client.get("/api/settings")
    assert res_settings.status_code == 200

