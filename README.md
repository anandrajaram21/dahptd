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
scripts/               Build verification scripts
.github/workflows/     CI checks
compose.yaml           Local development services
vercel.json            Deployment services and routing
.env.example           Local environment configuration
```

## Deployment

Import the repository into Vercel with the root directory set to `.` and the
Services preset. Pushes to `main` deploy both apps together. No environment
variables are required for the initial scaffold.
