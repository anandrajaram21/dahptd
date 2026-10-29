from datetime import date, time

from fastapi.testclient import TestClient

from app.analysis import (
    build_view,
    forecast_view,
    metrics,
    timestamp,
)
from app.main import app


def test_uses_single_latest_publication_at_or_before_cutoff():
    hour = timestamp("2026-01-02T00:00:00Z")
    next_hour = timestamp("2026-01-02T01:00:00Z")
    earlier = timestamp("2026-01-01T09:00:00Z")
    at_cutoff = timestamp("2026-01-01T10:00:00Z")
    later = timestamp("2026-01-01T10:01:00Z")
    publications = {
        earlier: {hour: 100, next_hour: 200},
        # The latest eligible publication lacks the second hour.
        at_cutoff: {hour: 120},
        later: {hour: 999, next_hour: 999},
    }
    result = build_view(date(2026, 1, 2), time(10), publications, {})
    assert result["publish_time"] == at_cutoff.isoformat()
    assert result["decision_at"] == "2026-01-01T10:00:00+00:00"
    assert [p["forecast"] for p in result["points"][:4]] == [120, 120, None, None]


def test_hourly_forecast_is_compared_with_each_half_hour():
    hour = timestamp("2026-01-02T00:00:00Z")
    published = timestamp("2026-01-01T09:30:00Z")
    actuals = {hour: 80, timestamp("2026-01-02T00:30:00Z"): 130}
    result = build_view(date(2026, 1, 2), time(10), {published: {hour: 100}}, actuals)
    first, second = result["points"][:2]
    assert len(result["points"]) == 48
    assert first["forecast"] == second["forecast"] == 100
    assert first["forecast_hour"] == second["forecast_hour"] == hour.isoformat()
    assert (first["error"], second["error"]) == (20, -30)
    assert result["metrics"]["matched_intervals"] == 2


def test_no_publication_before_cutoff():
    result = build_view(date(2026, 1, 2), time(9), {}, {})
    assert result["publish_time"] is None
    assert all(p["forecast"] is None for p in result["points"])
    assert result["metrics"]["mae"] is None
    assert result["metrics"]["accuracy"] is None


def test_metrics():
    points = [
        {"actual": 100, "error": 30},
        {"actual": 100, "error": -40},
        {"actual": None, "error": None},
    ]
    result = metrics(points)
    assert result["mae"] == 35
    assert result["rmse"] == (1250**0.5)
    assert result["accuracy"] == 65
    assert result["matched_intervals"] == 2
    assert result["expected_intervals"] == 3
    assert result["overestimated_intervals"] == 1
    assert result["underestimated_intervals"] == 1
    assert result["equal_intervals"] == 0


def test_snapshot_days_are_complete_at_default_cutoff():
    for day in range(1, 32):
        result = forecast_view(date(2026, 1, day), time(10))
        assert len(result["points"]) == 48
        assert result["publish_time"][11:16] == "09:30"
        assert result["publish_time"] <= result["decision_at"]
        assert result["metrics"]["matched_intervals"] == 48
        assert result["metrics"]["accuracy"] is not None
    february = forecast_view(date(2026, 2, 1), time(10))
    assert february["metrics"]["matched_intervals"] == 48


def test_cutoff_selects_different_publications():
    morning = forecast_view(date(2026, 1, 16), time(9))
    later = forecast_view(date(2026, 1, 16), time(10))
    assert morning["publish_time"] == "2026-01-15T07:30:00+00:00"
    assert later["publish_time"] == "2026-01-15T09:30:00+00:00"


def test_forecast_endpoint_and_validation():
    client = TestClient(app)
    response = client.get("/api/forecast?delivery_date=2026-01-16&cutoff=10:00")
    assert response.status_code == 200
    assert response.json()["decision_date"] == "2026-01-15"
    assert client.get("/api/forecast?delivery_date=2025-12-31").status_code == 422
    assert client.get("/api/forecast?delivery_date=2026-02-02").status_code == 422
    assert client.get("/api/forecast?cutoff=25:00").status_code == 422
