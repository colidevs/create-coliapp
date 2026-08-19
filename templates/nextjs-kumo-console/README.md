# {{name}}

Next.js console app on Kumo UI (`@cloudflare/kumo`), scaffolded from `create-coliapp`'s
`nextjs-kumo-console` template — colidevs' compliant reference implementation of the Kumo-console
frontend standard (ADR 0001, 0004, 0013, 0014, 0019-0026 in the hefesto repo, mirrored under
`.claude/rules/console-*.md` and `.claude/rules/frontend-*.md`).

This is the Phase 3 (`orders` CRUD module) state: Phase 1's skeleton (package setup, Kumo CSS
wiring, root layout, CI/Husky, code-generated icons), Phase 2's auth/tenant layer (protected-route
pattern, tenant selection, CASL UI-hint layer), plus a full contract-first `orders` example — API
design, generated client/Zod/MSW mocks, server-state data fetching, and a Kumo table + dialogs UI.
Cross-cutting concerns (CSP, Storybook, Playwright, Lighthouse) land in Phase 4.

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

**Known, flagged gap**: `src/proxy.ts`'s optimistic Proxy matcher (`/dashboard/:path*`) does not yet
cover `/orders` — `proxy.ts` was out of this phase's scope to touch. `verifySession()`, the real
authorization boundary, is unaffected. See `orders/page.tsx`'s own doc comment.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Auth/tenant layer (Phase 2)

**No real backend exists yet.** `templates/express-ts` ships only HTTP Basic Auth — no session
issuance, no `/session` endpoint. Per this change's design decision D2, [MSW](https://mswjs.io/) is
the default dev/test backend for everything, including session/membership data; `API_BASE_URL` (see
`.env.example`) is switchable to a real `express-ts` instance once one exists.

- `src/lib/session.ts` — shared session/tenant types, Zod schemas, and the pure
  `resolveActiveTenantId` tenant-scoping helper.
- `src/lib/dal.ts` — `verifySession()`, the real Data Access Layer boundary (`server-only`, React
  `cache()`). Redirects to `/login` when the session is absent or invalid — **there is no login
  route in this template yet**; building one is out of this phase's scope (see the SDD change's
  Phase 2 report for why).
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
(`src/lib/filter-param.test.ts`) only — Playwright E2E for the full login/tenant-switch/orders flow
is a later phase's job.

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
runs Biome + typecheck + Vitest unit tests + build on every PR. `.husky/pre-commit` runs the same
lint/typecheck/test pass locally before each commit.
