from datetime import date, time

from fastapi.testclient import TestClient

from app.analysis import build_day, dashboard, metrics, timestamp
from app.main import app


def test_cutoff_and_alignment():
    target = timestamp("2026-01-02T00:00:00Z")
    forecasts = {
        target: [
            (timestamp("2026-01-01T09:00:00Z"), 100),
            (timestamp("2026-01-01T10:00:00Z"), 120),
            (timestamp("2026-01-01T10:01:00Z"), 999),
        ]
    }
    actuals = {target: 80, timestamp("2026-01-02T00:30:00Z"): 100}
    result = build_day(date(2026, 1, 1), time(10), forecasts, actuals)
    point = result["points"][0]
    assert point["forecast"] == 120
    assert point["actual"] == 90
    assert point["error"] == 30
    assert result["metrics"]["matched_hours"] == 1
    assert result["points"][1]["forecast"] is None


def test_missing_half_hour_is_not_zero():
    target = timestamp("2026-01-02T00:00:00Z")
    result = build_day(date(2026, 1, 1), time(10), {}, {target: 0})
    assert result["points"][0]["actual"] is None
    assert result["metrics"]["mae"] is None


def test_metrics():
    result = metrics([{"error": 3}, {"error": -4}, {"error": None}])
    assert result["mae"] == 3.5
    assert result["bias"] == -0.5
    assert result["rmse"] == (12.5**0.5)
    assert result["matched_hours"] == 2
    assert result["expected_hours"] == 3


def test_snapshot_boundaries_and_no_lookahead():
    for number in range(1, 32):
        result = dashboard(date(2026, 1, number), time(10))
        assert len(result["points"]) == 24
        for point in result["points"]:
            if point["publish_time"]:
                assert timestamp(point["publish_time"]) <= timestamp(
                    result["decision_at"]
                )
    assert result["delivery_date"] == "2026-02-01"
    assert result["month_metrics"]["expected_hours"] == 744


def test_api_validation():
    client = TestClient(app)
    assert client.get("/api/dashboard").status_code == 200
    for query in [
        "decision_date=2026-02-01",
        "decision_date=not-a-date",
        "cutoff=25:00",
        "cutoff=10:00:30",
    ]:
        assert client.get(f"/api/dashboard?{query}").status_code == 422
