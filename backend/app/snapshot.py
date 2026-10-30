"""Loads the bundled Elexon snapshot: forecasts, actuals and source manifest."""

import gzip
import json
from collections import defaultdict
from datetime import datetime
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "elexon"


def timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@lru_cache(maxsize=1)
def load_data():
    """Return forecasts grouped by publication, and half-hourly actuals."""
    publications = defaultdict(dict)
    with gzip.open(DATA_DIR / "forecasts.json.gz", "rt") as file:
        for row in json.load(file):
            publications[timestamp(row["publishTime"])][timestamp(row["startTime"])] = (
                row["generation"]
            )
    with gzip.open(DATA_DIR / "actuals.json.gz", "rt") as file:
        actuals = {
            timestamp(row["startTime"]): row["generation"]
            for row in json.load(file)
            if row["fuelType"] == "WIND"
        }
    return dict(publications), actuals


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
