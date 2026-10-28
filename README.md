# Windward — day-ahead wind intelligence

A historical dashboard for exploring the wind forecasts available before a
January 2026 purchase decision, and evaluating their accuracy against Elexon
actual generation. Next.js/React with Bun and Tailwind CSS, plus Python/FastAPI
with uv. No database, external credentials, or request-time data downloads.

## Using the dashboard

Open http://localhost:3000, select a January purchase decision date, and choose a
decision cutoff. The chart shows the next delivery day's eligible wind forecast.
Enable **Show actuals** for a retrospective comparison. Daily and monthly metrics
show typical error (MAE), directional bias and, for the month, RMSE. Expand the
hourly table to inspect each forecast's publication time and signed error.

### Analysis assumptions

- Decisions on 1–31 January concern delivery on 2 January–1 February 2026.
- The default **10:00 Europe/London** cutoff is illustrative, not a verified
  auction deadline; the UI offers 09:00–12:00. January is GMT.
- For each target hour, take the forecast with the greatest `publishTime` at or
  before the decision cutoff. Never use a later publication. Selection is per
  target hour, not necessarily a single complete publication batch.
- Explicit interval assumption: an hourly WINDFOR value represents its starting
  hour. Align with the mean of the two FUELHH half-hours at `HH:00` and `HH:30`.
  This is not interpolation; both actual values must exist.
- Missing forecasts/actuals stay null. Metrics use only matched pairs and report
  their denominator; absent values are never treated as zero.
- Signed error = forecast − actual. MAE is mean absolute error; bias is mean signed
  error; RMSE is the square root of mean squared error. Monthly metrics pool all
  matched hourly errors rather than averaging daily RMSEs. All values are MW.
- The forecast summary is the mean of available hourly forecasts, not purchased
  energy. National wind data alone cannot establish a utility's procurement
  volume, prices or savings. Historical errors are not confidence intervals.
- Actuals, errors and full-month evaluation are hindsight, not information
  available on the selected decision date. Actuals are a retrieved snapshot.

### Architecture

`frontend/app/dashboard.tsx` fetches `/api/dashboard` through the existing proxy.
`backend/app/main.py` validates the date/cutoff; `backend/app/analysis.py` loads
the bundled snapshot, selects forecast vintages, aligns actuals and computes
metrics. The chart is a lightweight SVG with an equivalent inspectable data
table, avoiding a charting dependency. Loading, request failure and missing-data
states are explicit. Superseded client requests are cancelled.

The backend caches file loading and a bounded number of computed responses in
memory as a disposable performance optimization, not durable application state.
Tests cover cutoff inclusivity, no lookahead, aggregation, missing values,
metrics, all January dates, the February boundary and invalid API input.

Example: `/api/dashboard?decision_date=2026-01-15&cutoff=10:00`.

## Development

With Docker Compose:

```sh
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/health
- API docs: http://localhost:8000/api/docs

Source changes reload automatically. Rebuild after dependency or configuration
changes. Stop with `docker compose down`.
The data files are copied into the backend image rather than mounted: refreshing
the dataset requires rebuilding/recreating the backend container.

### Without Docker

Requires Bun 1.4.3 and uv 0.13.4. Run each app in a separate terminal:

```sh
cd backend
uv sync --frozen
uv run --frozen uvicorn app.main:app --reload
```

```sh
cd frontend
bun install --frozen-lockfile
bun run dev
```

The frontend proxies `/api/*` to `http://localhost:8000` locally. Override
`BACKEND_URL` if needed; see `.env.example`.

## Historical Elexon data

The backend bundles a read-only snapshot in `backend/data/elexon/`:

- `actuals.json.gz`: FUELHH wind actuals, 1 January–1 February 2026 inclusive.
- `forecasts.json.gz`: WINDFOR forecasts for that delivery window, published
  31 December 2025–31 January 2026 inclusive. All publication vintages are kept.
- `manifest.json`: retrieval time, exact source URLs, coverage, counts and SHA-256
  checksums of the compressed files.

The extra boundary days cover both January delivery dates and purchase decisions
made in January (which can concern 1 February delivery). All timestamps are UTC;
generation is MW. Forecasts are hourly in this snapshot; actuals are half-hourly.
No interpolation or purchasing cutoff is imposed by the downloader. Analysis must
select forecasts published before its documented decision cutoff and explicitly
align the different resolutions. Downloaded actuals are not an as-of archive.

Refresh from the repository root (Python 3.13; no third-party dependencies):

```sh
python3 backend/scripts/download_data.py
```

The script uses daily API requests, two concurrent workers, retries transient
failures, removes duplicate records, and checks complete half-hourly actuals
coverage before replacing files. Commit refreshed files and redeploy to update
the app; no request-time download or database is needed. Vercel explicitly
includes `data/elexon/**` in the backend function; Docker copies it with the code.

Read from Python backend modules using a path relative to the module, not the
process working directory, for example from `backend/app/main.py`:

```python
import gzip
import json
from pathlib import Path

data_dir = Path(__file__).resolve().parents[1] / "data" / "elexon"
with gzip.open(data_dir / "forecasts.json.gz", "rt", encoding="utf-8") as file:
    forecasts = json.load(file)
```

## Checks

```sh
cd frontend
bun run lint
bun run typecheck
bun run build
```

```sh
cd backend
uv run --frozen ruff check app tests scripts
uv run --frozen ruff format --check app tests scripts
uv run --frozen pytest
```

## Structure

```text
frontend/              Next.js app, Bun dependencies, Dockerfile
backend/               FastAPI app, tests, uv dependencies, Dockerfile
backend/data/elexon/   Bundled historical actuals, forecasts and provenance
backend/scripts/       Repeatable historical data downloader
.github/workflows/     CI checks
compose.yaml           Local development services
vercel.json            Deployment services and routing
.env.example           Local environment configuration
```

## Deployment

Import the repository into Vercel with the root directory set to `.` and the
Services preset. Pushes to `main` deploy both apps together. No environment
variables are required for the initial scaffold.

## AI assistance

OpenAI's coding assistant was used to help analyze the brief, implement and test
the Elexon downloader and dashboard, and document the design and assumptions.
