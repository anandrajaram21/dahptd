from datetime import date, time

from fastapi.testclient import TestClient

from app.analysis import build_day, dashboard, forecast_summary, metrics, timestamp
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
    assert result["overestimated_hours"] == 1
    assert result["underestimated_hours"] == 1
    assert result["equal_hours"] == 0


def test_forecast_summary_is_independent_of_outcomes():
    result = dashboard(date(2026, 1, 15), time(9, 45))
    summary = result["forecast_summary"]
    assert summary["available_hours"] == 24
    assert summary["expected_hours"] == 24
    assert summary["mean"] == 7975.083333333333
    assert summary["lowest"] == {
        "start_time": "2026-01-16T06:00:00+00:00",
        "forecast": 5881,
    }
    assert summary["highest"]["forecast"] == 10850
    assert summary["publication_times"] == ["2026-01-15T09:30:00+00:00"]
    changed_outcomes = [
        {**point, "actual": None, "error": None} for point in result["points"]
    ]
    assert forecast_summary(changed_outcomes) == summary


def test_empty_forecast_summary():
    result = build_day(date(2026, 1, 1), time(9), {}, {})
    assert result["forecast_summary"] == {
        "available_hours": 0,
        "expected_hours": 24,
        "mean": None,
        "lowest": None,
        "highest": None,
        "publication_times": [],
    }
    assert result["metrics"]["mae"] is None


def test_forecast_and_actual_coverage_are_distinct():
    first = timestamp("2026-01-02T00:00:00Z")
    second = timestamp("2026-01-02T01:00:00Z")
    published = timestamp("2026-01-01T07:30:00Z")
    result = build_day(
        date(2026, 1, 1),
        time(9),
        {first: [(published, 100)], second: [(published, 200)]},
        {first: 80, timestamp("2026-01-02T00:30:00Z"): 100, second: 150},
    )
    assert result["forecast_summary"]["available_hours"] == 2
    assert result["metrics"]["forecast_hours"] == 2
    assert result["metrics"]["actual_hours"] == 1
    assert result["metrics"]["matched_hours"] == 1


def test_mixed_publications_are_preserved():
    first = timestamp("2026-01-02T00:00:00Z")
    second = timestamp("2026-01-02T01:00:00Z")
    earlier = timestamp("2026-01-01T07:30:00Z")
    later = timestamp("2026-01-01T09:30:00Z")
    result = build_day(
        date(2026, 1, 1),
        time(9, 45),
        {first: [(earlier, 100), (later, 120)], second: [(earlier, 200)]},
        {},
    )
    assert result["forecast_summary"]["publication_times"] == [
        earlier.isoformat(),
        later.isoformat(),
    ]


def test_pre_auction_scenarios_select_different_vintages():
    for number in range(1, 32):
        epex = dashboard(date(2026, 1, number), time(9, 15))
        nord = dashboard(date(2026, 1, number), time(9, 45))
        assert all(p["publish_time"][11:16] == "07:30" for p in epex["points"])
        assert all(p["publish_time"][11:16] == "09:30" for p in nord["points"])


def test_month_breakdown_matches_pooled_scores_and_window():
    result = dashboard(date(2026, 1, 31), time(9, 45))
    days = result["month_days"]
    assert len(days) == 31
    assert days[0]["delivery_date"] == "2026-01-02"
    assert days[-1]["delivery_date"] == "2026-02-01"
    assert result["month_window"]["delivery_end"] == "2026-02-01"
    count = sum(day["metrics"]["matched_hours"] for day in days)
    assert result["month_metrics"]["matched_hours"] == count == 744
    weighted_mae = (
        sum(day["metrics"]["mae"] * day["metrics"]["matched_hours"] for day in days)
        / count
    )
    assert abs(result["month_metrics"]["mae"] - weighted_mae) < 1e-9
    assert result["snapshot"]["retrieved_at"].startswith("2026-10-28")
    assert len(result["snapshot"]["files"]["forecasts.json.gz"]["sha256"]) == 64


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
    assert client.get("/api/dashboard").json()["decision_at"].endswith("09:45:00+00:00")
    for query in [
        "decision_date=2026-02-01",
        "decision_date=not-a-date",
        "cutoff=25:00",
        "cutoff=10:00:30",
    ]:
        assert client.get(f"/api/dashboard?{query}").status_code == 422
