# {{name}}

Next.js console app on Kumo UI (`@cloudflare/kumo`), scaffolded from `create-coliapp`'s
`nextjs-kumo-console` template — colidevs' compliant reference implementation of the Kumo-console
frontend standard (ADR 0001, 0004, 0013, 0014, 0019-0026 in the hefesto repo, mirrored under
`.claude/rules/console-*.md` and `.claude/rules/frontend-*.md`).

This is the Phase 4 (cross-cutting concerns) state, plus Arc A4's real Better Auth wiring on top:
Phase 1's skeleton, Phase 2's auth/tenant layer, Phase 3's contract-first `orders` CRUD example,
Phase 4's own additions (a `/login` route, static CSP/`Permissions-Policy`, an ECharts example,
signed Thumbor image usage, Storybook component tests, Playwright E2E with
`@axe-core/playwright`, and a Lighthouse CI budget), and Arc A4's real login flow against
`templates/express-ts`'s Better Auth instance, alongside (not replacing) the original MSW/demo
flow — see "Login / auth" below.

## `orders` module (Phase 3)

Contract-first, per design decision D2: `openapi/openapi.yaml` is the source of truth; Orval
(`orval.config.ts`, `pnpm generate:api`) generates a typed fetch client, Zod schemas, and MSW/Faker
mocks into `src/generated/orders/` — never hand-edited, regenerated and committed after any spec
change.

- `src/lib/api/server-client.ts` — the Orval client's custom mutator (`server-only`). Forwards the
  session cookie plus the caller's `verifySession()`-resolved `activeTenantId` (as the
  `x-active-tenant` header) on every request, and points at `API_BASE_URL` — MSW by default,
  switchable to a running `express-ts` instance with no code change.
- `src/mocks/data/orders.ts` + `src/mocks/handlers/orders.ts` — an in-memory, tenant-scoped mock
  store and its MSW handlers (kept separate from Phase 2's `src/mocks/handlers.ts`, composed
  together in `src/mocks/node.ts`). Tenant scoping is enforced here, server-side, from the
  `x-active-tenant` header — never by the client.
- `src/app/(console)/orders/actions.ts` — `"use server"` create/update/delete actions, mapping any
  RFC 9457 Problem response through `@colidevs/utils`'s `problemToActionState` before it reaches
  `useActionState`. `queries.ts` holds the read-side Server Action `useSuspenseQuery` calls as its
  `queryFn`; `query-keys.ts` holds the shared, framework-free query-key builder both the page and
  the client list component import.
- `src/app/(console)/orders/page.tsx` — a per-request `QueryClient` (`src/lib/query-client.ts`,
  `environmentManager.isServer()`-gated), a non-awaited `prefetchQuery`, `<HydrationBoundary>`, and
  a `<Suspense>` boundary scoped to only the list component (`frontend-rendering-architecture.md`'s
  narrow-dynamism rule).
- `src/lib/filter-param.ts` — the local `nuqs` × AIP-160 bridge (`@colidevs/utils`'s
  `parseAip160Filter`/`serializeAip160Filter`, wrapped via `nuqs/server`'s `createParser`).
  **Server-side import only** — see that file's own doc comment for why.
- `src/components/orders/*.client.tsx` — Kumo's compound `Table.*`/`Dialog.*` components, each its
  own `"use client"` leaf per the RSC client-boundary rule.

`src/proxy.ts`'s optimistic Proxy matcher already covers `/orders/:path*` (updated in Phase 3) —
`verifySession()` is the real authorization boundary regardless.

## Login / auth (Phase 4, real backend added Arc A4)

`src/app/login/page.tsx` renders one of two mutually-exclusive paths, gated on `API_MOCKING`:

- **Real** (`API_MOCKING` unset/anything else) — `src/app/login/login-form.client.tsx`, a genuine
  email/password form against `src/lib/auth-client.ts`'s Better Auth React client
  (`createAuthClient`, no bearer plugin/`localStorage` — same-root-domain httpOnly cookies only),
  talking to `templates/express-ts`'s real Better Auth instance (`bearer` + `emailAndPassword`,
  Arc A1/A2 of hefesto's `docs/backlog/e2e-buildable-toolset-plan.md`).
- **MSW/demo** (`API_MOCKING=enabled`, the default) — `src/app/login/actions.ts`'s
  `signInDemoAction`, sets the `SESSION_COOKIE` (`src/lib/session.ts`; matches Better Auth's own
  default `better-auth.session_token` cookie name) to a fixed truthy value and redirects via
  `resolveSafeRedirect` to `?from=` (the path `proxy.ts` already round-trips) or `/orders`. See that
  file's own doc comment for exactly why a "Sign in as demo user" button — not an invented
  username/password UI — is the honest scope for *this* path: MSW's `/api/v1/session` handler only
  ever checks the cookie's presence, never a credential. `e2e/login.spec.ts` still exercises exactly
  this path (Playwright's `webServer.env` fixes `API_MOCKING=enabled`).

`src/lib/dal.ts`'s `verifySession()` mirrors the same split when reading a session back: MSW's
`/api/v1/session` (full multi-tenant `sessionSchema`) vs. the real `/api/v1/me`
(`meResponseSchema`, mapped onto the same shape via `sessionFromMeResponse` — see that function's
doc comment in `src/lib/session.ts` for the disclosed personal-workspace placeholder used until
Arc A3 wires real tenant/membership data).

**Real backend requires backend-side CORS/`trustedOrigins` wiring this template does not own** —
`templates/express-ts`'s `CORS_ALLOWED_ORIGINS` must include this app's dev origin
(`http://localhost:3000`), and its `cors()` middleware needs `credentials: true` added (not
present as of Arc A1/A2) for the browser's cross-port cookie flow to work. See this repo's PR
history for the exact, tracked follow-up.

`src/components/tenant-switcher.client.tsx` is the UI trigger for `selectTenant`
(`src/lib/actions/select-tenant.ts`) that didn't exist before this phase — mounted in
`(console)/layout.tsx`'s header, alongside `<AppLogo>`.

## Cross-cutting concerns (Phase 4)

- **CSP / `Permissions-Policy`** — `next.config.ts`'s `headers()`. Static CSP per
  `frontend-performance-tooling.md` (`frame-ancestors 'none'` + `X-Frame-Options: DENY`,
  `style-src`/`script-src 'self' 'unsafe-inline'` — see that file's doc comment for why
  `script-src` needs it too, an empirically-confirmed requirement, not just style tags).
  `experimental.serverActions.allowedOrigins` is a `localhost:3000` placeholder — a real deployment
  behind nginx-proxy-manager MUST set its own origin(s) (`frontend-security-auth.md`).
- **Chart** — `src/components/orders/orders-by-tenant-chart.client.tsx`, one ECharts example (Kumo
  ships no chart wrapper of its own), mounted on the orders page. Demo data only, deliberately not
  wired to a live aggregate query (out of this phase's "one example component" scope).
- **Thumbor image signing** — `src/lib/thumbor.ts` (`server-only`, wraps
  `@colidevs/thumbor-client@0.1.0`'s `buildThumborUrl`), consumed by `src/components/app-logo.tsx`
  (a signed placeholder logo, mounted in the console header). `THUMBOR_BASE_URL`/
  `THUMBOR_SECURITY_KEY` (`.env.example`) need real, non-empty values for `pnpm dev`/`pnpm run build`
  to succeed — `buildSignedThumborUrl` throws loudly on a missing key by design, and Next's
  static-shell prerendering pass evaluates `<AppLogo>` at build time. `.env.example`'s placeholders
  are enough locally; CI/Playwright/Lighthouse set their own placeholders explicitly (see
  `.github/workflows/frontend-standard.yml`, `playwright.config.ts`, `lighthouserc.json`) since none
  of them read `.env.local`. `src/lib/thumbor.test.ts` unit-tests the package's own `buildThumborUrl`
  directly (not the `server-only`-guarded wrapper, for the same reason `dal.ts` has no direct test).
- **Storybook** — `.storybook/`, stories for the `orders` table + both dialogs
  (`src/components/orders/*.stories.tsx`), `@storybook/addon-a11y` wired with `test: "error"` (fails
  on a real violation, not just dev-time `todo`). Runs as a Vitest "project"
  (`@storybook/addon-vitest`, real Chromium via `@vitest/browser-playwright`) — `pnpm test` runs both
  the `node` and `storybook` projects together. One-time local setup: `pnpm exec playwright install
  chromium`.
- **Playwright E2E** — `playwright.config.ts` + `e2e/*.spec.ts`: login (+ `?from=` round trip),
  tenant switch (the first phase able to test this — Phase 2/3 both flagged it as blocked on the
  missing `/login` route), full orders CRUD, a 422 validation-error case (a whitespace-only name —
  see `orders-validation.spec.ts`'s own comment for why not a literal empty string), and an
  `@axe-core/playwright` scan asserting zero serious/critical violations. `playwright.config.ts`'s
  own `webServer.env` explicitly sets `API_MOCKING=enabled` — never relies on a workstation's
  `.env.local`, since a run that silently hit a real, non-existent `express-ts` backend would fail
  for the wrong reason. Run: `pnpm run test:e2e`.
- **Lighthouse CI** — `lighthouserc.json`, a starting-point budget (category-score assertions only,
  no strict per-audit preset — a nearly-empty scaffold page shouldn't fail on production-app
  thresholds) against the two publicly-reachable routes (`/`, `/login`; `/orders` requires auth).
  Run: `pnpm run lhci`.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Auth/tenant layer (Phase 2, real backend option added Arc A4)

Per design decision D2, [MSW](https://mswjs.io/) remains a fully supported dev/test backend for
everything, including session/membership data — unchanged, not replaced. `templates/express-ts` now
also ships a real Better Auth instance (`bearer` + `emailAndPassword`, Arc A1/A2), gating a real
`GET /api/v1/me`. `API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL`/`API_MOCKING` (see `.env.example`)
switch between the two — no code change needed either way.

- `src/lib/session.ts` — shared session/tenant types, Zod schemas (`sessionSchema` for the MSW path,
  `meResponseSchema` for the real one), the pure `resolveActiveTenantId` tenant-scoping helper,
  `sessionFromMeResponse` (the real→`Session` mapping, with its disclosed personal-workspace
  placeholder), and `resolveSafeRedirect` (the shared open-redirect guard both login paths use).
- `src/lib/dal.ts` — `verifySession()`, the real Data Access Layer boundary (`server-only`, React
  `cache()`). Redirects to `/login` when the session is absent or invalid — see "Login / auth" above.
- `src/lib/auth-client.ts` — Better Auth's React client (`createAuthClient`), browser-side, backing
  the real login form.
- `src/proxy.ts` — the optimistic, cookie-presence-only fast path (Next.js's renamed
  `middleware.ts`). UX-shaping only; `verifySession()` is the real check.
- `src/lib/actions/select-tenant.ts` — the only writer of the httpOnly `active_tenant` cookie,
  validated against the session's own memberships before it writes anything.
- `src/lib/ability.ts` + `src/components/can.tsx` — a tenant-scoped CASL `Ability` builder and its
  `<Can>` client leaf. UI hint only, never a security boundary.
- `src/mocks/` — MSW's Node server (`src/instrumentation.ts` starts it, gated by `API_MOCKING`),
  handlers, and canned session/membership data (a user with memberships in two tenants).

Unit tests (`pnpm test`, Vitest) cover the pure logic in `ability.ts`, `session.ts`, the mock
tenant-scoping store (`src/mocks/data/orders.test.ts`), and the `nuqs` × AIP-160 bridge
(`src/lib/filter-param.test.ts`). Playwright E2E for the full login/tenant-switch/orders flow is
covered in Phase 4 — see "Cross-cutting concerns" above.

## Stack

- Next.js 16 (App Router), React 19, TypeScript.
- `@cloudflare/kumo` — pinned exact per hefesto's `console-ui-kumo.md` (never `^`/`~`) — with Tailwind
  CSS v4 wired in `src/app/globals.css` in the exact `@source` / `@import` order that rule requires.
- Biome only — no ESLint, no Prettier.
- `data-mode="light"` is set statically on `<html>` for now; theme-switching is not yet implemented.

## Icons

`src/app/icon.tsx` / `src/app/apple-icon.tsx` use Next.js's code-generated icon convention
(`ImageResponse` from `next/og`) instead of a static `.svg`/`.png`. This template ships no binary
assets at all, sidestepping a `create-coliapp` scaffolder bug where `replaceName()` reads/writes every
file as UTF-8 unconditionally and corrupts binary files.

## CI / local checks

`.github/workflows/frontend-standard.yml` (copied into every project scaffolded from this template)
runs three jobs on every PR: lint/typecheck/Vitest (node + Storybook projects)/build; a dedicated
Playwright E2E job; and a dedicated Lighthouse CI job. `.husky/pre-commit` runs the fast subset
locally before each commit (lint, typecheck, Vitest) — E2E and Lighthouse both start a real
dev/prod server and are deliberately CI-only, not pre-commit.
