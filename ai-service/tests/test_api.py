from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

import main
from services import llm

NOW = datetime.now(UTC)


def event(id_, title, category_id, category, days, regs=0, **extra):
    start = NOW + timedelta(days=days)
    return {
        "id": id_,
        "title": title,
        "description": extra.pop("description", f"{title} for students"),
        "type": extra.pop("type", "OTHER"),
        "category_id": category_id,
        "category": category,
        "tags": extra.pop("tags", []),
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(hours=2)).isoformat(),
        "registrations": regs,
        **extra,
    }


EVENTS = [
    event("e1", "HackNight Coding Marathon", "cat-tech", "Technical", 2, 40, type="TECHNICAL", tags=["hackathon"]),
    event("e2", "Spring Music Fest", "cat-cult", "Cultural", 20, 90, type="CULTURAL", tags=["music", "dance"]),
    event("e3", "Basketball Cup", "cat-sport", "Sports", 5, 10, type="SPORTS"),
    event("e4", "Cloud Deploy Clinic", "cat-tech", "Technical", 30, 5, type="WORKSHOP", is_online=True),
]


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    return TestClient(main.app, headers={"X-API-Key": "test-key"})


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_rejects_missing_api_key(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    res = TestClient(main.app).post("/search", json={"query": "x", "events": []})
    assert res.status_code == 401


def test_recommendations_prefer_interests_and_exclude_registered(client):
    res = client.post(
        "/recommendations",
        json={
            "user_features": {"user_id": "u1", "preferred_categories": ["cat-tech"]},
            "events": EVENTS,
            "exclude_event_ids": ["e4"],
            "limit": 3,
        },
    )
    assert res.status_code == 200
    ids = [r["event_id"] for r in res.json()]
    assert ids[0] == "e1"
    assert "e4" not in ids
    assert len(ids) == 3


def test_search_uses_synonyms_and_stemming(client):
    res = client.post("/search", json={"query": "coding competitions", "events": EVENTS})
    assert res.status_code == 200
    assert res.json()["results"][0]["event_id"] == "e1"


def test_search_online_intent(client):
    res = client.post("/search", json={"query": "online technical workshop", "events": EVENTS})
    assert res.json()["results"][0]["event_id"] == "e4"


def test_predict_category(client):
    res = client.post(
        "/predict-category", json={"title": "Football tournament", "description": "Inter college match day"}
    )
    assert res.status_code == 200
    assert res.json()["predicted_category"] == "SPORTS"


def test_validation_errors_are_json(client):
    res = client.post("/predict-category", json={"title": "x"})
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_assistant_without_key_returns_503(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    res = client.post("/assistant/chat", json={"message": "hi", "events": EVENTS, "now": NOW.isoformat()})
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "AI_UNAVAILABLE"


def test_assistant_filters_unknown_event_ids(client, monkeypatch):
    monkeypatch.setattr(llm, "_complete_json", lambda *a, **k: {"reply": "Try HackNight!", "event_ids": ["e1", "fake"]})
    monkeypatch.setenv("GROQ_API_KEY", "x")
    res = client.post("/assistant/chat", json={"message": "coding?", "events": EVENTS, "now": NOW.isoformat()})
    assert res.status_code == 200
    assert res.json() == {"reply": "Try HackNight!", "event_ids": ["e1"]}


def test_assistant_rate_limit_maps_to_429(client, monkeypatch):
    def boom(*_a, **_k):
        raise llm.LLMError(429, "busy")

    monkeypatch.setattr(llm, "_complete_json", boom)
    res = client.post("/assistant/describe", json={"title": "Chess Night", "type": "SPORTS"})
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "AI_RATE_LIMITED"


def test_dates_are_formatted_in_viewer_timezone():
    assert llm._human("2026-11-15T04:00:00Z", llm._zone("Asia/Kolkata")) == "Sun 15 Nov, 9:30 AM"
    assert llm._human("2026-11-15T04:00:00Z", llm._zone("../etc/passwd")) == "Sun 15 Nov, 4:00 AM"
