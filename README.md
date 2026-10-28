# Wind forecast explorer

Minimal Next.js (TypeScript/Bun) + FastAPI (Python/uv) scaffold for a UK wind
forecast analysis pilot. The dashboard, Elexon ingestion, and accuracy analysis
are **not implemented**. No mock data is passed off as actual generation.

## Local development

Requires Docker with Compose:

```sh
docker compose up --build
```

- Frontend: http://localhost:3000
- API health: http://localhost:8000/api/health
- Interactive API docs: http://localhost:8000/api/docs
- Same-origin API through Next.js: http://localhost:3000/api/health

App source directories are mounted for hot reload. Rebuild after dependency or
configuration changes. No secrets or environment setup are required initially.
Stop with `docker compose down`.

Without Docker, use Bun 1.4.3 and uv 0.13.4 in two terminals:

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

`BACKEND_URL` defaults to `http://localhost:8000` outside Docker; see `.env.example`.
It is server-only and used by the local Next.js rewrite. Vercel uses its own
service routing instead. Never expose credentials in `NEXT_PUBLIC_*` variables.

## Deploy to Vercel

**App URL:** pending first deployment.

1. Push this repo to a personal GitHub account using an anonymous repository name
   (the brief requires a public repo).
2. Import it into a **Vercel Hobby** project. Keep Root Directory at the repository
   root, not `frontend/`; the root `vercel.json` defines both services.
3. Set the production branch to `main`. No database, integration, or secret is needed.
4. Pushes to `main` deploy both apps together; PRs receive combined preview URLs.
5. Open `/`, use **Check backend connection**, and verify `/api/docs` and a missing
   `/api/` route (should return JSON 404).
6. Replace the pending app URL above. Verify submission links in incognito; ensure
   reviewers can access production without sign-in. Do not disable preview
   protection just to automate testing; use `vercel curl` for protected deployments.

[Vercel Services](https://vercel.com/docs/services) is **beta, available on all
plans**. `/api/*` goes directly to FastAPI; everything else goes to Next.js.
Paths retain `/api` inside FastAPI. There is no extra Next.js function hop or CORS
setup. Dockerfiles are for local development; Vercel uses native framework builds.

The frontend catch-all deliberately uses `/(.*)`: Vercel's Services build compiles
`/:path*` into a regex that does not match the bare `/` path. Validate the actual
generated routes after building with Vercel (requires a linked project):

```sh
vercel build --prod
bun scripts/check-vercel-routing.mjs
```

This checks service selection for the homepage, frontend paths/assets, and API
paths. A plain `next build` or JSON-schema check cannot detect this routing error.

GitHub Actions runs checks independently of Vercel. Deployment is not gated on
Actions passing; protect `main` with required checks if that is desired.

## Keep hosting within Hobby

- The landing page is statically rendered; the API is called only on a button click.
  No polling, cron, always-on containers, databases, paid integrations, or AI APIs.
- The backend is stateless, small, and capped at 10 seconds per invocation. This
  is a duration limit, **not a spending cap**. No durable writes to its filesystem.
- Runtime dependencies are limited to FastAPI/Uvicorn; testing tools are dev-only.
- For the next phase, download January 2026 historical data with a separate local
  script and bundle a compact read-only snapshot. Do not fetch a whole month at
  startup or on each API request. Add caching to immutable analysis responses.
- Check the account's usage dashboard before sharing widely. Hobby has finite
  compute, transfer, build, and request allowances; exceeding them can pause the
  app. This scaffold cannot guarantee free hosting for arbitrary traffic.
- Hobby is for personal, non-commercial use. A personal hiring demo is the intended
  scope here; hosting a commercial client product requires reviewing eligibility.

Current references: [Hobby](https://vercel.com/docs/plans/hobby),
[Services pricing](https://vercel.com/docs/services/pricing).

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

## Layout

- `frontend/app/`: static landing page and on-demand API connectivity check.
- `frontend/next.config.ts`: same-origin API proxy for local development only.
- `backend/app/`: FastAPI app; `/api/health`, `/api/docs`, `/api/openapi.json`.
- `backend/tests/`: health, schema, and missing-route tests.
- `compose.yaml`, per-app Dockerfiles: local development with hot reload.
- `vercel.json`: one project, two native services, shared public routing.
- `.github/workflows/ci.yml`: frontend checks/build and backend lint/tests.
- `opencode.jsonc`, `AGENTS.md`: project-scoped agent tooling and guidance.
- `frontend/bun.lock`, `backend/uv.lock`: reproducible dependency resolution.

## Challenge notes

Use Elexon WINDFOR forecasts and FUELHH actuals filtered to WIND. The brief scopes
data to purchase decisions made in January 2026; delivery windows can cross month
boundaries. Define the market decision cutoff before selecting forecasts, retain
`publishTime`, and reject forecasts published after that cutoff to prevent look-ahead
bias. No market-cutoff assumption is encoded in this scaffold yet.

The submission also requires a maximum 10-minute video: up to five minutes each for
the customer pitch and technical walkthrough, plus public repo and deployed app links.

## AI disclosure

OpenAI's coding assistant was used to plan and generate the initial scaffold,
configuration, tests, and documentation. Human review is required before submission.
