"""Reproducible, publication-time-aware analysis of the bundled Elexon snapshot."""

from bisect import bisect_right
from collections import Counter, defaultdict
from datetime import UTC, date, datetime, time, timedelta
from functools import lru_cache
from math import sqrt
from zoneinfo import ZoneInfo

from app.snapshot import load_data, snapshot_metadata, timestamp

LONDON = ZoneInfo("Europe/London")
FIRST_DELIVERY = date(2026, 1, 1)
LAST_DELIVERY = date(2026, 2, 1)
MONTH_START = date(2026, 1, 1)
MONTH_END = date(2026, 1, 31)
HALF_HOUR = timedelta(minutes=30)


# Responses, cached per input.


@lru_cache(maxsize=64)
def forecast_view(delivery_date: date, cutoff: time):
    publications, actuals = load_data()
    return {
        **build_view(delivery_date, cutoff, publications, actuals),
        **release_schedule(delivery_date, publications),
        "snapshot": snapshot_metadata(),
        "unit": "MW",
        "timezone": "Europe/London",
    }


@lru_cache(maxsize=32)
def month_view(cutoff: time):
    return {
        **build_month(cutoff, *load_data()),
        "cutoffs": cutoff_comparison(),
        "snapshot": snapshot_metadata(),
        "unit": "MW",
        "timezone": "Europe/London",
    }


@lru_cache(maxsize=1)
def cutoff_comparison():
    """Month-level metrics for every whole-hour cutoff, for comparison."""
    publications, actuals = load_data()
    return [
        {
            "cutoff": month["cutoff"],
            "publications": month["publications"],
            **month["summary"],
        }
        for month in (
            build_month(time(hour), publications, actuals) for hour in range(24)
        )
    ]


# One delivery day.


def latest_publication(publications, decision_at: datetime):
    """The single most recent publication at or before the cutoff, if any."""
    times = sorted(publications)
    index = bisect_right(times, decision_at)
    return times[index - 1] if index else None


def build_view(delivery_date: date, cutoff: time, publications, actuals):
    decision_date = delivery_date - timedelta(days=1)
    decision_at = datetime.combine(decision_date, cutoff, LONDON)
    published = latest_publication(publications, decision_at)
    forecast = publications.get(published, {})
    points = publication_points(delivery_date, forecast, actuals)
    return {
        "delivery_date": delivery_date.isoformat(),
        "decision_date": decision_date.isoformat(),
        "decision_at": decision_at.isoformat(),
        "publish_time": published.isoformat() if published else None,
        "points": points,
        "metrics": metrics(points),
    }


def publication_points(delivery_date, forecast, actuals):
    start = datetime.combine(delivery_date, time(), LONDON).astimezone(UTC)
    end = datetime.combine(delivery_date + timedelta(days=1), time(), LONDON)
    points = []
    interval = start
    while interval < end:
        # Each hourly forecast is compared separately with both half-hours.
        hour = interval.replace(minute=0)
        value = forecast.get(hour)
        actual = actuals.get(interval)
        points.append(
            {
                "start_time": interval.isoformat(),
                "forecast_hour": hour.isoformat(),
                "forecast": value,
                "actual": actual,
                "error": value - actual
                if value is not None and actual is not None
                else None,
            }
        )
        interval += HALF_HOUR
    return points


def release_schedule(delivery_date: date, publications):
    """Which publication each whole-hour cutoff would use for this delivery day,
    and the clock times of every release on the decision date."""
    decision_date = delivery_date - timedelta(days=1)
    releases = []
    for hour in range(24):
        published = latest_publication(
            publications, datetime.combine(decision_date, time(hour), LONDON)
        )
        releases.append(
            {
                "cutoff": f"{hour:02d}:00",
                "publish_time": published.isoformat() if published else None,
            }
        )
    schedule = sorted(
        time_label(p.isoformat())
        for p in publications
        if p.astimezone(LONDON).date() == decision_date
    )
    return {"cutoff_releases": releases, "schedule": schedule}


# The whole month.


def month_days():
    day = MONTH_START
    while day <= MONTH_END:
        yield day
        day += timedelta(days=1)


def build_month(cutoff: time, publications, actuals):
    """January delivery days at one cutoff: month totals, days and time of day."""
    views = [build_view(day, cutoff, publications, actuals) for day in month_days()]
    points = [point for view in views for point in view["points"]]
    by_time = defaultdict(list)
    for point in points:
        by_time[time_label(point["start_time"])].append(point)
    # Clock time of the publication each day used; usually one value.
    releases = Counter(
        time_label(view["publish_time"]) for view in views if view["publish_time"]
    )
    return {
        "cutoff": cutoff.strftime("%H:%M"),
        "publications": [
            {"time": label, "days": days} for label, days in sorted(releases.items())
        ],
        "summary": summary(points),
        "days": [
            {
                "delivery_date": view["delivery_date"],
                "publish_time": view["publish_time"],
                **summary(view["points"]),
            }
            for view in views
        ],
        "time_of_day": [
            {"time": label, **summary(group)}
            for label, group in sorted(by_time.items())
        ],
    }


# Accuracy metrics.


def metrics(points):
    pairs = [p for p in points if p["error"] is not None]
    errors = [p["error"] for p in pairs]
    count = len(errors)
    total_actual = sum(p["actual"] for p in pairs)
    absolute = sum(abs(e) for e in errors)
    return {
        "mae": absolute / count if count else None,
        "rmse": sqrt(sum(e * e for e in errors) / count) if count else None,
        # 100% - WAPE: total absolute error relative to total actual output.
        "accuracy": 100 * (1 - absolute / total_actual) if total_actual else None,
        "matched_intervals": count,
        "expected_intervals": len(points),
        "overestimated_intervals": sum(e > 0 for e in errors),
        "underestimated_intervals": sum(e < 0 for e in errors),
        "equal_intervals": sum(e == 0 for e in errors),
    }


def summary(points):
    """Metrics plus signed and level averages over matched half-hours."""
    pairs = [p for p in points if p["error"] is not None]
    count = len(pairs)
    return {
        **metrics(points),
        "mean_error": sum(p["error"] for p in pairs) / count if count else None,
        "mean_forecast": sum(p["forecast"] for p in pairs) / count if count else None,
        "mean_actual": sum(p["actual"] for p in pairs) / count if count else None,
    }


def time_label(value: str) -> str:
    return timestamp(value).astimezone(LONDON).strftime("%H:%M")
