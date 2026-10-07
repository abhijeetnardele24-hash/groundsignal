from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

from .test_schemas import feature


client = TestClient(app)


def valid_payload() -> dict[str, object]:
    calibration = []
    for index in range(4):
        calibration.append({**feature(f"smooth-{index}", 0.5 + index * 0.02), "label": "smooth"})
        calibration.append({**feature(f"rough-{index}", 8.0 + index * 0.1), "label": "rough"})
    return {
        "session_id": "session_123",
        "mobility_mode": "walking",
        "phone_placement": "front_pocket",
        "calibration": calibration,
        "audit": [feature("audit-1", 0.6)],
    }


def test_health_does_not_expose_secrets() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "provider": "nearest-centroid-baseline"}
    assert response.headers["x-content-type-options"] == "nosniff"


def test_model_card_documents_privacy_boundary_and_abstention() -> None:
    response = client.get("/v1/model-card")
    assert response.status_code == 200
    body = response.json()
    assert body["abstain_threshold"] == 0.58
    assert "precise location" in body["excluded_inputs"]
    assert any("human review" in limitation for limitation in body["limitations"])


def test_analysis_returns_privacy_and_safety_language() -> None:
    response = client.post("/v1/analyze", json=valid_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "nearest-centroid-baseline"
    assert "raw sensor" in body["privacy"].lower()
    assert "not a safety guarantee" in body["disclaimer"].lower()


def test_unknown_fields_are_rejected() -> None:
    payload = valid_payload()
    payload["precise_location"] = {"latitude": 1, "longitude": 2}
    response = client.post("/v1/analyze", json=payload)
    assert response.status_code == 422
