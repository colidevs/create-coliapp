"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Same-root-domain Better Auth client (Arc A4, hefesto's
 * `docs/backlog/e2e-buildable-toolset-plan.md`) — talks to
 * `templates/express-ts`'s real Better Auth instance (`src/lib/auth.ts`,
 * `bearer` + `emailAndPassword` only, Arc A1/A2).
 *
 * Deliberately **no bearer plugin, no `localStorage` token**. That pattern
 * (`munod/www/src/lib/auth-client.ts`) exists only because munod's frontend
 * and API sit on genuinely different root domains (`munodhome.com` vs
 * `munod.colidevs.com`), where Better Auth's `crossSubDomainCookies` can't
 * apply and cookies don't travel — a documented, separate escape hatch
 * (Arc A5, `docs/decisions/0036-cross-domain-frontend-api-auth.md`, not yet
 * accepted), never this template's default. Here, frontend and API are
 * assumed to share a root domain (`app.<product>.com` + `api.<product>.com`
 * in production; two ports on `localhost` in local dev — see this repo's
 * PR description for the exact CORS/`trustedOrigins` follow-up that local
 * topology needs on the `express-ts` side). Better Auth's own httpOnly
 * session cookie is set directly by the browser on a successful
 * `signIn.email()` call (`src/app/login/login-form.client.tsx`) and is
 * forwarded automatically by the browser afterward — no manual
 * `cookies().set(...)` (that was `signInDemoAction`'s own compensation for
 * having no real backend, see `src/app/login/actions.ts`), no
 * client-readable token storage of any kind
 * (`.claude/rules/frontend-security-auth.md`'s httpOnly-cookie-only
 * mandate).
 *
 * `baseURL` is intentionally a *different* env var from `src/lib/dal.ts`'s
 * (server-only) `API_BASE_URL`, even though both should point at the same
 * running `express-ts` instance: this module runs in the browser, and
 * Next.js only inlines `NEXT_PUBLIC_*`-prefixed env vars into the client
 * bundle — a plain `process.env.API_BASE_URL` read here would be
 * `undefined` at runtime. See `.env.example` for both vars kept in sync.
 */
export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
});

export const { signIn, signOut, useSession } = authClient;
