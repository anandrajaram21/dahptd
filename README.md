# Full-stack starter

Next.js with Bun and Tailwind CSS, plus FastAPI with uv.

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
uv run --frozen ruff check .
uv run --frozen ruff format --check .
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

OpenAI's coding assistant was used to help implement and test the historical
Elexon data downloader and document its design.
