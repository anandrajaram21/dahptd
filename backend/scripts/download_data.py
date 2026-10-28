"""Download the challenge's historical Elexon snapshot (standard library only)."""

import argparse
import gzip
import hashlib
import json
import math
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
TARGET_START = date(2026, 1, 1)
TARGET_END = date(2026, 2, 2)  # Exclusive: include 1 February delivery.
PUBLICATION_START = date(2025, 12, 31)
PUBLICATION_END = date(2026, 2, 1)  # Exclusive: include 31 January decisions.
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "elexon"


def days(start: date, end: date):
    while start < end:
        yield start
        start += timedelta(days=1)


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"Timestamp must include a timezone: {value}")
    return parsed.astimezone(UTC)


def midnight(value: date) -> datetime:
    return datetime.combine(value, datetime.min.time(), tzinfo=UTC)


def fetch(dataset: str, day: date) -> tuple[list[dict], str]:
    if dataset == "FUELHH":
        params = {
            "settlementDateFrom": day.isoformat(),
            "settlementDateTo": day.isoformat(),
            "fuelType": "WIND",
        }
    else:
        params = {
            "publishDateTimeFrom": f"{day.isoformat()}T00:00:00Z",
            "publishDateTimeTo": (f"{(day + timedelta(days=1)).isoformat()}T00:00:00Z"),
        }
    url = f"{BASE_URL}/{dataset}/stream?{urlencode(params)}"
    request = Request(url, headers={"Accept": "application/json"})
    for attempt in range(5):
        try:
            with urlopen(request, timeout=90) as response:
                rows = json.load(response)
            if not isinstance(rows, list) or not rows:
                raise ValueError(f"Expected a nonempty JSON array from {url}")
            print(f"{dataset} {day}: {len(rows)} source records", flush=True)
            return rows, url
        except (URLError, TimeoutError) as exc:
            if isinstance(exc, HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 4:
                raise
            delay = 2 ** (attempt + 1)
            if isinstance(exc, HTTPError):
                retry_after = exc.headers.get("Retry-After", "")
                if retry_after.isdigit():
                    delay = max(delay, int(retry_after))
            time.sleep(delay)
    raise RuntimeError("Unreachable")


def prepare(dataset: str, rows: list[dict]) -> list[dict]:
    """Validate and deduplicate, preserving source fields and forecast vintages."""
    unique = {}
    for row in rows:
        if row.get("dataset") != dataset:
            raise ValueError(f"Unexpected dataset in {row}")
        if dataset == "FUELHH" and row.get("fuelType") != "WIND":
            raise ValueError("FUELHH response contains non-wind generation")
        start = timestamp(row["startTime"])
        published = timestamp(row["publishTime"])
        generation = row["generation"]
        if (
            isinstance(generation, bool)
            or not isinstance(generation, (int, float))
            or not math.isfinite(generation)
        ):
            raise ValueError(f"Invalid generation in {row}")
        if not midnight(TARGET_START) <= start < midnight(TARGET_END):
            continue
        if dataset == "WINDFOR" and not (
            midnight(PUBLICATION_START) <= published < midnight(PUBLICATION_END)
        ):
            continue
        key = (start, published)
        if key in unique and unique[key] != row:
            raise ValueError(f"Conflicting records for {dataset} {key}")
        unique[key] = row
    result = [unique[key] for key in sorted(unique)]
    if not result:
        raise ValueError(f"No relevant {dataset} records")
    return result


def validate_actuals(rows: list[dict]) -> None:
    expected = {
        midnight(day) + timedelta(minutes=30 * period)
        for day in days(TARGET_START, TARGET_END)
        for period in range(48)
    }
    observed = {timestamp(row["startTime"]) for row in rows}
    if observed != expected:
        raise ValueError(
            f"Actuals coverage mismatch: {len(expected - observed)} missing, "
            f"{len(observed - expected)} unexpected intervals"
        )


def encode(rows: list[dict]) -> bytes:
    # Stable compression: downloading the same records yields the same hash.
    raw = json.dumps(rows, separators=(",", ":"), sort_keys=True).encode()
    return gzip.compress(raw, mtime=0)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    jobs = [
        (dataset, day)
        for dataset, start, end in (
            ("FUELHH", TARGET_START, TARGET_END),
            ("WINDFOR", PUBLICATION_START, PUBLICATION_END),
        )
        for day in days(start, end)
    ]
    collected = {"FUELHH": [], "WINDFOR": []}
    sources = {"FUELHH": [], "WINDFOR": []}
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(fetch, dataset, day) for dataset, day in jobs]
        for (dataset, _), future in zip(jobs, futures, strict=True):
            rows, url = future.result()
            collected[dataset].extend(rows)
            sources[dataset].append(url)

    prepared = {key: prepare(key, rows) for key, rows in collected.items()}
    validate_actuals(prepared["FUELHH"])
    # Do not replace any existing snapshot until every download validates.
    args.output_dir.mkdir(parents=True, exist_ok=True)
    files = {}
    payloads = {}
    for dataset, filename in (
        ("FUELHH", "actuals.json.gz"),
        ("WINDFOR", "forecasts.json.gz"),
    ):
        rows = prepared[dataset]
        payload = encode(rows)
        payloads[filename] = payload
        files[filename] = {
            "dataset": dataset,
            "records": len(rows),
            "unique_start_times": len({row["startTime"] for row in rows}),
            "start_time_min": min(row["startTime"] for row in rows),
            "start_time_max": max(row["startTime"] for row in rows),
            "publish_time_min": min(row["publishTime"] for row in rows),
            "publish_time_max": max(row["publishTime"] for row in rows),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "source_urls": sources[dataset],
        }
    manifest = {
        "retrieved_at": datetime.now(UTC).isoformat(),
        "target_start_inclusive": TARGET_START.isoformat(),
        "target_end_exclusive": TARGET_END.isoformat(),
        "forecast_publication_start_inclusive": PUBLICATION_START.isoformat(),
        "forecast_publication_end_exclusive": PUBLICATION_END.isoformat(),
        "generation_unit": "MW",
        "notes": [
            "Includes January delivery and decisions (including 1 February delivery).",
            "Forecast publication times and all source fields are preserved.",
            "No auction cutoff, interpolation, or forecast/actual alignment applied.",
            "Actuals reflect the API at retrieval, not an as-of historical archive.",
        ],
        "files": files,
    }
    payloads["manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    for filename, payload in payloads.items():
        temporary = args.output_dir / f"{filename}.tmp"
        temporary.write_bytes(payload)
        temporary.replace(args.output_dir / filename)
    print(json.dumps({name: info["records"] for name, info in files.items()}))
    print(f"Snapshot saved to {args.output_dir}")


if __name__ == "__main__":
    main()
