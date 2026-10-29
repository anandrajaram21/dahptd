from datetime import date, time

from fastapi.testclient import TestClient

from app.analysis import (
    build_month,
    build_view,
    forecast_view,
    metrics,
    month_view,
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


def test_daily_view_lists_releases_for_every_cutoff():
    result = forecast_view(date(2026, 1, 16), time(17))
    assert result["schedule"] == [
        "02:30",
        "04:30",
        "07:30",
        "09:30",
        "12:25",
        "15:30",
        "18:30",
        "22:30",
    ]
    releases = {r["cutoff"]: r["publish_time"] for r in result["cutoff_releases"]}
    assert len(releases) == 24
    # Before the first release of the day, the previous evening's one is used.
    assert releases["00:00"] == "2026-01-14T22:30:00+00:00"
    assert releases["13:00"] == "2026-01-15T12:25:00+00:00"
    assert releases["16:00"] == releases["18:00"] == result["publish_time"]


def test_forecast_endpoint_and_validation():
    client = TestClient(app)
    response = client.get("/api/forecast?delivery_date=2026-01-16&cutoff=10:00")
    assert response.status_code == 200
    assert response.json()["decision_date"] == "2026-01-15"
    assert client.get("/api/forecast?delivery_date=2025-12-31").status_code == 422
    assert client.get("/api/forecast?delivery_date=2026-02-02").status_code == 422
    assert client.get("/api/forecast?cutoff=25:00").status_code == 422


def test_month_summarises_days_and_time_of_day_at_one_cutoff():
    hour = timestamp("2026-01-01T00:00:00Z")
    published = timestamp("2025-12-31T09:30:00Z")
    later = timestamp("2025-12-31T10:30:00Z")
    actuals = {hour: 80, timestamp("2026-01-01T00:30:00Z"): 130}
    result = build_month(
        time(10), {published: {hour: 100}, later: {hour: 999}}, actuals
    )
    assert result["cutoff"] == "10:00"
    assert len(result["days"]) == 31
    first = result["days"][0]
    assert first["publish_time"] == published.isoformat()
    assert (first["mean_error"], first["mean_forecast"]) == (-5, 100)
    assert first["matched_intervals"] == 2
    # Later days fall back to the latest earlier publication, never a later one.
    assert result["days"][1]["publish_time"] == later.isoformat()
    assert result["days"][1]["matched_intervals"] == 0
    assert [t["time"] for t in result["time_of_day"][:2]] == ["00:00", "00:30"]
    assert result["time_of_day"][1]["mean_error"] == -30
    assert result["summary"]["matched_intervals"] == 2


def test_snapshot_month_is_january_only_and_compares_every_cutoff():
    result = month_view(time(10))
    assert result["days"][0]["delivery_date"] == "2026-01-01"
    assert result["days"][-1]["delivery_date"] == "2026-01-31"
    assert result["summary"]["matched_intervals"] == 31 * 48
    assert len(result["time_of_day"]) == 48
    assert [c["cutoff"] for c in result["cutoffs"]] == [
        f"{hour:02d}:00" for hour in range(24)
    ]
    assert result["publications"] == [{"time": "09:30", "days": 31}]
    by_cutoff = {c["cutoff"]: c["publications"] for c in result["cutoffs"]}
    # Cutoffs between two releases share the same forecast.
    assert by_cutoff["16:00"] == by_cutoff["18:00"] == [{"time": "15:30", "days": 31}]
    assert by_cutoff["13:00"] == [
        {"time": "11:30", "days": 30},
        {"time": "12:25", "days": 1},
    ]
    selected = next(c for c in result["cutoffs"] if c["cutoff"] == "10:00")
    assert selected["accuracy"] == result["summary"]["accuracy"]
    # The previous evening's last publication lacks two hours of delivery.
    assert result["cutoffs"][0]["matched_intervals"] < 31 * 48


def test_monthly_endpoint_validation():
    client = TestClient(app)
    response = client.get("/api/monthly?cutoff=12:00")
    assert response.status_code == 200
    assert response.json()["cutoff"] == "12:00"
    assert client.get("/api/monthly?cutoff=24:00").status_code == 422
