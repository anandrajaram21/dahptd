# dahptd

Historical GB wind forecast dashboard using Elexon data: Next.js frontend and
FastAPI backend, with a bundled January 2026 snapshot.

**Live app:** https://dahptd.vercel.app

## Run locally

Requires Docker with Docker Compose. From the repository root:

```sh
docker compose up --build
```

Open http://localhost:3000. Stop with `docker compose down`.
No API keys or database setup are required.

## Files and directories

| Path | Contents |
| --- | --- |
| `frontend/app/` | Next.js routes, root layout and global styles |
| `frontend/components/` | Dashboard building blocks; `daily/` and `monthly/` hold each page; `ui/` holds shadcn primitives |
| `frontend/hooks/` | Shared API fetching |
| `frontend/lib/` | Response types, URL settings and formatting (no React) |
| `frontend/tests/` | Frontend tests |
| `backend/app/main.py` | FastAPI endpoints and input validation |
| `backend/app/analysis.py` | Forecast selection, accuracy metrics and responses |
| `backend/app/snapshot.py` | Loading the bundled data and manifest |
| `backend/data/elexon/` | Bundled forecasts, actuals and source manifest |
| `backend/scripts/` | Historical data downloader |
| `backend/tests/` | Backend tests |
| `backend/pyproject.toml`, `backend/uv.lock` | Python dependencies and lockfile |
| `backend/Dockerfile` | Backend container build |
| `presentation/` | Slide deck, speaker notes and screenshots |
| `.github/workflows/` | CI checks |
| `compose.yaml` | Local frontend and backend services |
| `vercel.json` | Deployment routing and services |
| `.env.example` | Optional local configuration |

## AI assistance

AI coding assistants were used in building this project, including writing and
refactoring code, tests and documentation. All changes were reviewed by the
author.
