"""Reproducible, publication-time-aware analysis of the bundled Elexon snapshot."""

import gzip
import json
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from functools import lru_cache
from math import sqrt
from pathlib import Path
from zoneinfo import ZoneInfo

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "elexon"
LONDON = ZoneInfo("Europe/London")


def timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@lru_cache(maxsize=1)
def load_data():
    forecasts = defaultdict(list)
    with gzip.open(DATA_DIR / "forecasts.json.gz", "rt") as file:
        for row in json.load(file):
            forecasts[timestamp(row["startTime"])].append(
                (timestamp(row["publishTime"]), row["generation"])
            )
    for values in forecasts.values():
        values.sort()
    with gzip.open(DATA_DIR / "actuals.json.gz", "rt") as file:
        actuals = {
            timestamp(row["startTime"]): row["generation"]
            for row in json.load(file)
            if row["fuelType"] == "WIND"
        }
    return forecasts, actuals


def metrics(points):
    errors = [p["error"] for p in points if p["error"] is not None]
    count = len(errors)
    return {
        "mae": sum(abs(e) for e in errors) / count if count else None,
        "bias": sum(errors) / count if count else None,
        "rmse": sqrt(sum(e * e for e in errors) / count) if count else None,
        "matched_hours": count,
        "expected_hours": len(points),
        "forecast_hours": sum(p.get("forecast") is not None for p in points),
        "actual_hours": sum(p.get("actual") is not None for p in points),
        "overestimated_hours": sum(e > 0 for e in errors),
        "underestimated_hours": sum(e < 0 for e in errors),
        "equal_hours": sum(e == 0 for e in errors),
    }


def forecast_summary(points):
    available = [p for p in points if p["forecast"] is not None]
    lowest = min(available, key=lambda p: p["forecast"]) if available else None
    highest = max(available, key=lambda p: p["forecast"]) if available else None
    return {
        "available_hours": len(available),
        "expected_hours": len(points),
        "mean": sum(p["forecast"] for p in available) / len(available)
        if available
        else None,
        "lowest": {key: lowest[key] for key in ("start_time", "forecast")}
        if lowest
        else None,
        "highest": {key: highest[key] for key in ("start_time", "forecast")}
        if highest
        else None,
        "publication_times": sorted({p["publish_time"] for p in available}),
    }


def build_day(decision_date: date, cutoff: time, forecasts, actuals):
    decision_at = datetime.combine(decision_date, cutoff, LONDON)
    delivery_date = decision_date + timedelta(days=1)
    start = datetime.combine(delivery_date, time(), LONDON)
    points = []
    for hour in range(24):
        target = start + timedelta(hours=hour)
        eligible = [
            (published, value)
            for published, value in forecasts.get(target, [])
            if published <= decision_at
        ]
        published, forecast = max(eligible) if eligible else (None, None)
        halves = [actuals.get(target), actuals.get(target + timedelta(minutes=30))]
        actual = sum(halves) / 2 if all(v is not None for v in halves) else None
        points.append(
            {
                "start_time": target.isoformat(),
                "publish_time": published.isoformat() if published else None,
                "forecast": forecast,
                "actual": actual,
                "error": forecast - actual
                if forecast is not None and actual is not None
                else None,
            }
        )
    return {
        "decision_date": decision_date.isoformat(),
        "decision_at": decision_at.isoformat(),
        "delivery_date": delivery_date.isoformat(),
        "points": points,
        "metrics": metrics(points),
        "forecast_summary": forecast_summary(points),
    }


@lru_cache(maxsize=32)
def month_review(cutoff: time):
    forecasts, actuals = load_data()
    month_points = []
    days = []
    for number in range(1, 32):
        view = build_day(date(2026, 1, number), cutoff, forecasts, actuals)
        month_points.extend(view["points"])
        days.append(
            {key: view[key] for key in ("decision_date", "delivery_date", "metrics")}
        )
    return {
        "month_metrics": metrics(month_points),
        "month_days": days,
        "month_window": {
            "decision_start": "2026-01-01",
            "decision_end": "2026-01-31",
            "delivery_start": "2026-01-02",
            "delivery_end": "2026-02-01",
        },
    }


@lru_cache(maxsize=1)
def snapshot_metadata():
    with (DATA_DIR / "manifest.json").open() as file:
        manifest = json.load(file)
    return {
        "retrieved_at": manifest["retrieved_at"],
        "files": {
            name: {key: details[key] for key in ("dataset", "sha256")}
            for name, details in manifest["files"].items()
        },
    }


@lru_cache(maxsize=32)
def dashboard(decision_date: date, cutoff: time):
    forecasts, actuals = load_data()
    day = build_day(decision_date, cutoff, forecasts, actuals)
    return {
        **day,
        **month_review(cutoff),
        "snapshot": snapshot_metadata(),
        "unit": "MW",
        "timezone": "Europe/London",
    }
