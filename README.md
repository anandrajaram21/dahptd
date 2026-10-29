# dahptd

A historical dashboard for exploring the GB wind forecasts available before a
day-ahead decision, and comparing them with Elexon actual generation.
Next.js/React with Bun, Tailwind CSS and shadcn/ui, plus Python/FastAPI with uv.
No database, external credentials, or request-time data downloads.

## Using the dashboard

Open http://localhost:3000. Page 1 shows the forecast for one delivery day:

- **Delivery date** is the day being forecast (1 January–1 February 2026). Pick
  it from the calendar or step with the arrows.
- **Cutoff time** is on the day before delivery (default 10:00
  GMT). The chart uses the single latest forecast published at or before it;
  the badge shows which publication that is.
- The chart plots every forecast hour for the delivery day, with hover details.
- **Show actuals & errors** overlays half-hourly actual output, a signed error
  bar chart, and accuracy, MAE, RMSE and too-high/too-low counts. Actuals are
  hindsight: they were not available at the cutoff. The checkbox keeps its state
  when the date or cutoff changes.
- Numbered markers link to **Assumptions & methodology** at the bottom.

The URL preserves date, cutoff and the actuals toggle.

### Monthly overview

Open http://localhost:3000/monthly or use the header navigation. It evaluates
all 31 January 2026 delivery days at one cutoff (the same whole-hour buttons as
the daily page; the header carries the cutoff between pages):

- **Headline:** how often the forecast was too high and by how much on average,
  plus month accuracy, MAE and RMSE.
- **Forecast vs actual, day by day:** daily average forecast and actual. Click a
  day to open it on the daily page with actuals shown.
- **Every day at a glance:** a calendar shaded by daily accuracy, with the best
  and worst days called out. Each day links to the daily page.
- **When in the day do misses happen?** Average signed error for each half-hour
  of the day across the month.
- **Does a later cutoff help?** Month accuracy for every whole-hour cutoff.
  Click a point to select that cutoff.

API: `/api/monthly?cutoff=10:00`. The response includes the cutoff comparison,
which is computed once and cached.

### Analysis assumptions

- The cutoff is on the day before delivery, Europe/London time (GMT in January).
  10:00 is an illustrative planning point, not an exchange rule.
- Use the single WINDFOR publication with the greatest `publishTime` at or before
  the cutoff. Never use a later publication, and never fill hours it lacks from
  another publication; missing hours stay as gaps.
- Each hourly forecast is compared separately with both FUELHH half-hours it
  covers (`HH:00` and `HH:30`), with no averaging. The chart holds the hourly
  value flat across both half-hours. Variation within an hour counts as error.
- Signed error = forecast − actual, so positive means the forecast was too high.
  MAE is mean absolute error; RMSE is the square root of mean squared error;
  accuracy is 100% − WAPE (sum of absolute errors ÷ sum of actual output). All
  values are MW and describe the selected delivery day only.
- Missing forecasts/actuals stay null. Metrics use only matched half-hours and
  report their denominator; absent values are never treated as zero.
- Both series describe GB operational-metered wind, not all UK/embedded wind.
  Actuals are a retrieved snapshot and can reflect curtailment, availability and
  telemetry as well as weather. See [methodology](docs/methodology.md).

### Architecture

`frontend/app/forecast-page.tsx` renders the page with shadcn/ui components
(`frontend/components/ui/`) and fetches `/api/forecast` through the local proxy.
`frontend/app/forecast-chart.tsx` draws the synced forecast and error charts with
Recharts; `frontend/app/forecast-data.ts` owns response types, URL settings and
formatting. `backend/app/main.py` validates the delivery date and cutoff;
`backend/app/analysis.py` loads the bundled snapshot, selects the publication,
pairs half-hourly actuals and computes metrics.

Example: `/api/forecast?delivery_date=2026-01-16&cutoff=10:00`.

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
