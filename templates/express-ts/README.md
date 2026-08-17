# {{name}}

Express + TypeScript backend, scaffolded from `create-coliapp`'s `express-ts` template. Backend/API
stack decisions are recorded in ADR 0014 (`docs/decisions/0014-backend-api-stack.md` in the hefesto
repo) and mirrored in `.claude/rules/backend-template-stack.md`.

## Local development

```bash
pnpm install
pnpm dev
```

### Secrets via Infisical (recommended over a local `.env`)

Once this project is deployed via `infra` (`apps/<INFRA_APP_PATH>/deploy.config`, see
`infra`'s `build-api.template.yml`), the SAME Infisical project/secret-path also backs local
development — one source of truth for secrets in both places, not a separately-maintained `.env`.

```bash
pnpm dev:infisical
```

This runs:

```bash
infisical run --projectId $INFISICAL_PROJECT_ID --env prod --silent --domain https://infisical.coli.com.ar -- pnpm dev
```

Set `INFISICAL_PROJECT_ID` to the UUID of THIS project's Infisical project — the same one referenced
by `INFISICAL_PROJECT_SLUG`/`INFISICAL_SECRET_PATH` in this app's `apps/<INFRA_APP_PATH>/deploy.config`
entry in `colidevs/infra`, once this app has one. Requires an active Infisical CLI session
(`infisical login`) — see `infra/docs/setup/workstation-scripts.md`'s "ephemeral credential wrapper"
pattern, which this follows: secrets are injected as env vars for the duration of the command only,
never written to disk.

Falling back to a plain `.env` (`pnpm dev`, `.env.example` as a starting point) remains supported for
local-only work with no shared secrets.

## Data access

Two supported paths — pick ONE per project, based on infra's Postgres hosting decision (self-hosted
vs. Supabase-hosted):

- **Plain Postgres + Drizzle** (`src/lib/db/`): `withTenantSession`/`withPlatformSession` open an
  explicit transaction and set `app.tenant_id` via a parameterized `set_config(..., true)` as the
  FIRST statement, so Postgres RLS policies (`drizzle/0001_rls_roles.sql`) can enforce tenant
  isolation. The raw Drizzle instance is never exported — only these two session-scoped functions.
  Migrations run via `pnpm db:generate` / `pnpm db:migrate` against the migration/owner role
  (`DATABASE_OWNER_URL`); the app itself connects with the `app_runtime` role (`DATABASE_RUNTIME_URL`,
  `NOBYPASSRLS`) — see `src/lib/db/client.ts`.
- **Supabase-hosted / PostgREST** (`src/lib/postgrest/`): `attachPostgrestClient` middleware builds a
  fresh `PostgrestClient` per request, forwarding that request's own `Authorization` header so
  PostgREST resolves the correct Postgres role and RLS applies naturally — never a single
  service-role client shared across requests.

## Errors

`src/v1/res/errors.ts`'s `HttpError` hierarchy emits RFC 9457 Problem Details
(`type`/`status`/`title`/`detail`/`instance`, `application/problem+json`), per ADR 0009.

## API contract

`openapi/openapi.yaml` is a scaffolded placeholder — replace it with the real Apidog-exported spec
(ADR 0005) as soon as one exists. `express-openapi-validator` validates every `/api/v1` request and
response against it before the route handler runs.

## Health

- `GET /health` — process-alive only, no dependency checks (Compose `HEALTHCHECK`).
- `GET /ready` — checks DB connectivity (Ansible rollout gating).

Both are mounted outside `/api/v1` and are not part of the OpenAPI-validated surface.
