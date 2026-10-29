# dahptd

A historical dashboard for exploring the wind forecasts available before a
January 2026 purchase decision, and evaluating their accuracy against Elexon
actual generation. Next.js/React with Bun and Tailwind CSS, plus Python/FastAPI
with uv. No database, external credentials, or request-time data downloads.

## Using the dashboard

Open http://localhost:3000. The dashboard has two tasks:

- **Wind forecast** shows the next delivery day's eligible forecast, publication
  time, available hours, average, minimum and maximum. Actuals and realised error
  metrics are kept out of this view.
- **Forecast accuracy** compares forecasts with recorded output retrospectively.
  Choose one day or all January decisions. The daily error breakdown links to each
  delivery day, including a shortcut to the largest daily miss. Only day views
  show date controls.

The decision date and delivery date are labelled separately. **Change scenario**
offers example pre-close planning times for Nord Pool and EPEX, or a custom
research time. These are illustrative workflows, not confirmed client settings.
Hover or use arrow keys in the chart; expand **Hourly values** for the equivalent
table. **Data & calculation details** contains sources, assumptions and snapshot
provenance. CSV exports retain the selected context, units and snapshot hashes;
forecast-only exports exclude actuals and errors. The URL preserves date, time,
scenario, task and accuracy period, including browser back/forward navigation.

### Analysis assumptions

- Decisions on 1–31 January concern delivery on 2 January–1 February 2026.
- The default example is **Nord Pool hourly, plan at 09:45 GMT** before the normal
  09:50 close. The EPEX example plans at **09:15 GMT**, before its 09:20 close.
  Five-minute buffers are illustrative, not exchange rules; practical receipt and
  submission timing must be confirmed. A custom cutoff makes no auction claim.
  January is GMT. See [sources and remaining uncertainties](docs/methodology.md).
- For each target hour, take the forecast with the greatest `publishTime` at or
  before the decision cutoff. Never use a later publication. Selection is per
  target hour, not necessarily a single complete publication batch.
- Explicit interval assumption: an hourly WINDFOR value is treated as mean power
  for its starting hour. Align with the mean of the two FUELHH half-hours at
  `HH:00` and `HH:30`. This is not interpolation; both actual values must exist.
  WINDFOR's interval-average semantics still need publisher confirmation.
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
- Both series describe GB operational-metered wind, not all UK/embedded wind.
  Exact historical population equivalence remains unverified. Operational output
  can reflect curtailment, availability and telemetry; differences cannot be
  attributed exclusively to weather forecasting from these aggregates.

### Architecture

`frontend/app/dashboard.tsx` fetches `/api/dashboard` through the existing proxy.
`backend/app/main.py` validates the date/cutoff; `backend/app/analysis.py` loads
the bundled snapshot, selects forecast vintages, aligns actuals and computes
metrics and forecast-only summaries. `frontend/app/dashboard-data.ts` owns typed
response shapes, validated URL settings, formatting and contextual CSV export.
`frontend/app/wind-chart.tsx` renders the full-day chart with keyboard/hover
inspection and publication details. An equivalent data table remains available.
Loading, request failure and missing-data states are explicit. Superseded client
requests are cancelled and stalled requests time out after 15 seconds.

The backend caches file loading, month evaluations independently of the selected
day, and a bounded number of responses in disposable memory. Tests cover cutoff
inclusivity, no lookahead, aggregation, missing values, distinct coverage counts,
mixed publication vintages, market examples, pooled monthly results, the February
boundary, invalid input, URL settings and exports without hindsight leakage.

Example: `/api/dashboard?decision_date=2026-01-15&cutoff=09:45`.

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
bun run test
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
docs/methodology.md    Domain sources, decision scenarios and open assumptions
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
