import "server-only";

import { cookies } from "next/headers";
import { env } from "@/env";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const SERVICE_KEY_HEADER = "x-service-key";
// Literal name Better Auth's own `bearer` plugin issues (and
// `apps/api/openapi/openapi.yaml`'s `sessionCookie` security scheme names,
// `in: cookie`), NOT `session-cookie.ts`'s `SESSION_COOKIE_NAME`
// (`"session_token"`, `apps/web`'s own httpOnly bridge-cookie name — see
// `src/lib/auth-client.ts`'s ADR 0022/0036 doc comment). The two names are
// deliberately different from each other; forwarding one under the other's
// name does not authenticate.
const BETTER_AUTH_SESSION_COOKIE_NAME = "better-auth.session_token";

/**
 * Orval's generated client's custom mutator (`orval.config.ts`'s
 * `output.override.mutator`) — every generated function under
 * `src/generated/**` calls this directly. `server-only`
 * (`.claude/rules/frontend-security-auth.md`'s "server-only as a structural
 * guard") because it reads `env.SERVICE_KEY`; this must never end up in a
 * client bundle.
 *
 * Sends `x-service-key` (matching `apps/api`'s
 * `src/v1/middlewares/service-auth.ts`, `verifyStaticServiceKey` /
 * ADR 0009's static-API-key service-to-service carve-out) — deliberately NOT
 * munod's `lib/api.ts` Basic-auth `btoa(user:password)` scheme, which
 * `apps/api` does not implement at all.
 *
 * Resolves to Orval's default `includeHttpResponseReturnType: true`
 * fetch-client envelope (`{ data, status, headers }`) — mirrors
 * `templates/nextjs-kumo-console/src/lib/api/server-client.ts`'s own mutator
 * shape. Deliberately never throws for a Problem (422/404/...) response: each
 * generated function's return type is a discriminated union keyed on
 * `status`, so a Server Action narrows on `result.status` and hands
 * `result.data` to `@colidevs/utils`'s `problemToActionState` on the error
 * branch (`console-golden-path.md`) — no try/catch needed for the expected
 * RFC 9457 error path.
 */
export async function apiRequest<T>(
	url: string,
	init: RequestInit,
): Promise<T> {
	// Forward the caller's session to `apps/api` — admin routes require it
	// (both `express-openapi-validator`'s declared `sessionCookie` security
	// scheme AND `src/v1/middlewares/auth.ts`'s own Better Auth session
	// check) in addition to the service-to-service `x-service-key` above.
	// Found live by a real pilot build (`ecommerce-admin-template` PR10):
	// without this, every admin Server Action 401s immediately after a
	// successful browser-side sign-in, because this mutator otherwise
	// carries no per-request identity at all — `x-service-key` proves the
	// caller is a trusted server, never who the signed-in user is.
	//
	// This is deliberately NOT a verbatim forward of the incoming `Cookie`
	// header, and NOT an `Authorization: Bearer` header either — both were
	// tried and empirically confirmed wrong against a real running
	// `apps/api` before landing on this shape:
	// - `apps/web` never receives a `better-auth.session_token` cookie of
	//   its own (that cookie, if it exists at all, is scoped to `apps/api`'s
	//   own origin — a cross-origin deployment per ADR 0022/0036's escape
	//   hatch, `src/lib/auth-client.ts`). The only session artifact `apps/web`
	//   actually holds is its OWN httpOnly bridge cookie
	//   (`session-cookie.ts`'s `SESSION_COOKIE_NAME`, `"session_token"` —
	//   note the different name), so there is nothing meaningful to forward
	//   verbatim in the first place.
	// - `Authorization: Bearer <token>` — which DOES work against Better
	//   Auth's own mounted `/api/auth/*` routes (`src/lib/
	//   get-server-session.ts` uses exactly this) — returns 401 against
	//   `/api/v1/admin/*`: `express-openapi-validator` enforces its
	//   declared `sessionCookie` security scheme (`in: cookie`, name
	//   `better-auth.session_token`) BEFORE the request ever reaches Better
	//   Auth's own session check, and rejects a request missing that exact
	//   cookie regardless of any valid bearer header.
	// The one shape that satisfies both layers: read the bridge cookie's
	// VALUE (the same signed token Better Auth itself issues — see
	// `src/app/api/session/route.ts`) and re-send it under Better Auth's
	// OWN cookie name.
	//
	// Best-effort: `cookies()` throws outside a request context (e.g. during
	// static generation), which the public/storefront callers of this same
	// mutator can legitimately hit — those calls proceed with no `cookie`
	// header, exactly as before this fix.
	const sessionToken = await cookies()
		.then((store) => store.get(SESSION_COOKIE_NAME)?.value)
		.catch(() => undefined);

	const response = await fetch(`${env.API_BASE_URL}${url}`, {
		...init,
		headers: {
			"content-type": "application/json",
			[SERVICE_KEY_HEADER]: env.SERVICE_KEY,
			...(sessionToken
				? {
						cookie: `${BETTER_AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
					}
				: {}),
			...init.headers,
		},
		cache: "no-store",
	});

	const data =
		response.status === 204
			? undefined
			: await response.json().catch(() => undefined);

	return {
		data,
		status: response.status,
		headers: response.headers,
	} as T;
}
