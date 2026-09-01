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
  fresh `PostgrestClient` per request, so PostgREST resolves the correct Postgres role and RLS applies
  naturally — never a single service-role client shared across requests. Mount it AFTER the `auth`
  session-checking middleware (`src/v1/middlewares/auth.ts`) on any route that needs a
  session-scoped, RLS-authenticated client: `router.get(path, auth, attachPostgrestClient, handler)`.

  **PostgREST/JWT bridge (Arc A3 of hefesto's `docs/backlog/e2e-buildable-toolset-plan.md`,
  proposed — pending review, not yet an accepted ADR 0014 amendment):** Better Auth's `bearer`
  plugin issues opaque session tokens that PostgREST cannot verify. `auth` also mints a short-lived,
  PostgREST-verifiable JWT for the same session via Better Auth's `jwt` plugin
  (`getAuth().api.getToken()`) and attaches it to `res.locals.jwt`; `attachPostgrestClient` signs the
  PostgREST-bound `Authorization` header with THAT JWT, never the client's own opaque bearer token. A
  route with no `auth` in front of it (intentionally public/anonymous) still gets a valid PostgREST
  client — just with no `Authorization` header, matching PostgREST's own anon-role behavior.

  The JWT carries a `role` claim (default `"authenticated"`, override via `POSTGREST_JWT_ROLE`) that
  PostgREST uses to pick which Postgres role to switch into. PostgREST verifies the JWT against a
  JWK Set, not this app's `BETTER_AUTH_SECRET` — see `.env.example` for the one-time deploy step
  (fetch `GET {BETTER_AUTH_URL}/api/auth/jwks`, paste into PostgREST's own `PGRST_JWT_SECRET`).

## Errors

`src/v1/res/errors.ts`'s `HttpError` hierarchy emits RFC 9457 Problem Details
(`type`/`status`/`title`/`detail`/`instance`, `application/problem+json`), per ADR 0009.

## API contract

`openapi/openapi.yaml` is a **generated file** — do not hand-edit it. It is produced from this
template's Zod schemas (`src/v1/modules/**/types.ts`, `src/v1/res/problem-schema.ts`) via
`zod-openapi`, colidevs' code-first OpenAPI standard (ADR 0040, superseding ADR 0005's prior
Apidog-first design mandate). `express-openapi-validator` validates every `/api/v1` request and
response against it before the route handler runs.

Add a new endpoint by writing its request/response Zod schemas, wiring the route into
`scripts/generate-openapi.ts`'s `buildDocument()`, then running:

```sh
pnpm generate:openapi
```

`pnpm generate:openapi:check` re-runs the same generation and diffs it byte-for-byte against the
committed file without writing anything — it fails the moment the two disagree. It runs in
`.husky/pre-commit` and as a CI step in `.github/workflows/api-standard.yml`, so a stale
`openapi/openapi.yaml` cannot land on `main`.

### API standard checks (schema-shape)

`.spectral.yaml` lints `openapi/openapi.yaml` against ADR 0009's shape rules (RFC 9457 error
responses, `/v1` versioning, plural-noun resource naming, cursor pagination, ≥1 example + a declared
`security` field per operation). `pnpm run api-standard:lint` runs it locally;
`pnpm run api-standard:license` runs `license-checker-rseidelsohn` per ADR 0011 (blocks
GPL/LGPL/AGPL/SSPL-class dependencies). Both, plus an additive-only oasdiff check against the PR's
base branch, run in `.github/workflows/api-standard.yml` on every pull request — loud (a visible ✗),
not a merge block (GitHub Free has no branch protection on private repos; the real gate is
deploy-time, see hefesto's `.claude/rules/api-enforcement.md`). Behavioral rules (ADR 0010/0012/0013 —
tenant-ownership checks, cache-key tenant dimension, RBAC placement) are not lint-tool-checkable and
stay in hefesto's `api-standard-check` skill instead.

### Attestation gate (behavioral findings)

`hefesto`'s `api-standard-check` skill writes its behavioral verdicts to `api-standard/findings.json`
(schema: `version`, `scope_digest`, `checked_at`, `findings[]` with `rule`/`path`/`status`, plus
`reason`/`approver`/`review_after` when `status: "exception"`). `scripts/api-standard-gate.mjs`
(zero dependencies — `node:crypto`/`node:fs`/`node:child_process` only) recomputes `scope_digest`
from the checked-out commit (never the working tree) and fails closed on any unresolved `open`
finding, expired exception, or malformed/missing attestation. Run it locally with
`node scripts/api-standard-gate.mjs`; exit codes are `0` pass, `1` blocking finding, `2`
malformed/missing attestation. It runs as a step in the same `.github/workflows/api-standard.yml`
job above — same loud-not-blocking posture, same deploy-time real gate plan.

## Health

- `GET /health` — process-alive only, no dependency checks (Compose `HEALTHCHECK`).
- `GET /ready` — checks DB connectivity (Ansible rollout gating).

Both are mounted outside `/api/v1` and are not part of the OpenAPI-validated surface.
