import "server-only";

import { cookies } from "next/headers";

import { verifySession } from "@/lib/dal";
import { ACTIVE_TENANT_HEADER, SESSION_COOKIE } from "@/lib/session";

// Switchable per design decision D2 (kumo-console-template SDD change): MSW
// is the default dev/test backend for the orders module too, not just
// session data (src/lib/dal.ts carries the identical comment). Flip
// API_BASE_URL to a running templates/express-ts instance and nothing here
// needs to change — the "Backend switch" spec scenario this phase must
// satisfy.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * The Orval-generated orders client's custom mutator (`orval.config.ts`'s
 * `output.override.mutator`) — every generated `ordersApi` function
 * (`src/generated/orders/endpoints/**`) calls this directly, making it the
 * one place session/tenant forwarding and the MSW-vs-`express-ts`
 * `API_BASE_URL` switch both happen. `server-only` (frontend-security-auth.md)
 * because it reads the httpOnly session cookie via `next/headers` — this
 * must never end up in a client bundle.
 *
 * Resolves to Orval's default `includeHttpResponseReturnType: true`
 * fetch-client envelope (`{ data, status, headers }`). Deliberately never
 * throws for a Problem (422/404/...) response: each generated function's own
 * return type is a discriminated union keyed on `status` (e.g.
 * `createOrderResponse = { status: 201; data: Order } | { status: 422; data:
 * Problem } | ...`), so a Server Action narrows on `result.status` itself and
 * hands `result.data` to `@colidevs/utils`'s `problemToActionState` on the
 * error branch — no try/catch needed for the expected RFC 9457 error path. A
 * thrown error here stays reserved for genuine transport failures (network
 * down, non-JSON body), which `fetch`/`response.json()` already throw
 * naturally.
 *
 * Forwards the caller's **resolved** active tenant — `verifySession()`'s own
 * `activeTenantId` (`src/lib/dal.ts`), not the raw `active_tenant` cookie
 * directly. This matters: `resolveActiveTenantId` (`src/lib/session.ts`)
 * falls back to the caller's first membership whenever that cookie is
 * absent (e.g. before `selectTenant()`, `src/lib/actions/select-tenant.ts`,
 * has ever run) — reading the cookie here directly would leave every
 * request tenant-less until the user explicitly switches once. Calling
 * `verifySession()` again costs nothing extra: it is wrapped in React's
 * `cache()`, so within one request/render it has already been resolved by
 * whatever page/action called this. The resolved tenant is forwarded as the
 * `x-active-tenant` header (`ACTIVE_TENANT_HEADER`) — deliberately a header,
 * not a cookie, and deliberately never trusted back from a client: this
 * value is computed server-side, once, right here, and the MSW-mocked (and,
 * later, real) backend's own handler is what actually enforces tenant
 * scoping from it (the "Tenant switch scopes data" spec scenario this phase
 * must satisfy never relies on the client to filter anything).
 *
 * **Known, flagged gap (mirrors `select-tenant.ts`'s own comment)**: there is
 * no per-tenant `Authorization: Bearer` credential to attach yet —
 * `templates/express-ts` ships only HTTP Basic Auth, and Better Auth
 * (`.claude/rules/backend-template-stack.md`) isn't wired into this
 * template. Forwarding the session cookie alongside the resolved-tenant
 * header is the interim, honest mechanism; swap in a real Bearer token here
 * once that backend work lands — never fake one in the meantime.
 */
export async function apiRequest<T>(
	url: string,
	init: RequestInit,
): Promise<T> {
	const [session, cookieStore] = await Promise.all([
		verifySession(),
		cookies(),
	]);
	const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

	const response = await fetch(`${API_BASE_URL}${url}`, {
		...init,
		headers: {
			"content-type": "application/json",
			[ACTIVE_TENANT_HEADER]: session.activeTenantId,
			...(sessionCookie
				? { cookie: `${SESSION_COOKIE}=${sessionCookie}` }
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
