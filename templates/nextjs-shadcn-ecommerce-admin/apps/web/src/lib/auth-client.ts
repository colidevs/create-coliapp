import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

const BEARER_TOKEN_KEY = "app_bearer_token";

/**
 * Ported from munod (`munod/www/src/lib/auth-client.ts`), adapted:
 * `NEXT_PUBLIC_AUTH_URL` → `NEXT_PUBLIC_API_BASE_URL` (this template has one
 * backend, `apps/api`, serving both Better Auth's `/api/auth/*` routes and
 * the versioned `/api/v1` API — no separate auth service).
 *
 * This is the cross-root-domain escape hatch (`.claude/rules/
 * frontend-security-auth.md`'s "Cross-root-domain escape hatch", ADR 0022/
 * 0036): `apps/web` and `apps/api` are two separate deployables in this
 * monorepo (ADR 0029), not guaranteed to share a root domain, so Better
 * Auth's `bearer` plugin (wired in `apps/api/src/lib/auth.ts`) is used
 * instead of a same-origin httpOnly cookie. The bearer token is bridged into
 * an httpOnly cookie on `apps/web`'s own domain (via `POST /api/session`) so
 * `src/lib/get-server-session.ts` can validate a session server-side without
 * ever reading `localStorage` itself — the token sits in `localStorage`
 * only in the brief window between sign-in and that bridge call, the exact,
 * disclosed exposure the ADR 0036 escape hatch accepts.
 *
 * **Known, flagged gap (infra-only scope, this PR)**: `POST /api/session` /
 * `DELETE /api/session` (a Next.js Route Handler mirroring the cookie into
 * an httpOnly cookie, munod's own `@/app/api/session/route.ts`) is not
 * created here — it is page/route content, out of scope for this batch
 * (Phase 5, apps/web infra). It lands in Phase 7 alongside the real login
 * page. Until then this hook's own fetch calls are harmless no-ops against a
 * 404 (fetch resolves on any HTTP status; nothing here throws).
 */
const client = createAuthClient({
	baseURL: env.NEXT_PUBLIC_API_BASE_URL,
	fetchOptions: {
		auth: {
			type: "Bearer",
			token: () =>
				typeof window === "undefined"
					? undefined
					: (localStorage.getItem(BEARER_TOKEN_KEY) ?? undefined),
		},
		// Async + awaited on purpose (munod's own finding): better-fetch awaits
		// an async onSuccess hook before resolving the outer call — without the
		// await, a sign-in navigation could beat the session-bridge POST,
		// leaving a Server Component gate unable to see the session yet.
		onSuccess: async (ctx) => {
			const token = ctx.response.headers.get("set-auth-token");
			if (token) {
				localStorage.setItem(BEARER_TOKEN_KEY, token);
				await fetch("/api/session", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token }),
				});
			}
			if (ctx.request.url.toString().includes("/sign-out")) {
				localStorage.removeItem(BEARER_TOKEN_KEY);
				await fetch("/api/session", { method: "DELETE" });
			}
		},
		onError: async (ctx) => {
			if (ctx.response?.status === 401) {
				localStorage.removeItem(BEARER_TOKEN_KEY);
				await fetch("/api/session", { method: "DELETE" });
			}
		},
	},
});

export { client as authClient };
