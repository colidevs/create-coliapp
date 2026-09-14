import "server-only";

import { env } from "@/env";

const SERVICE_KEY_HEADER = "x-service-key";

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
	const response = await fetch(`${env.API_BASE_URL}${url}`, {
		...init,
		headers: {
			"content-type": "application/json",
			[SERVICE_KEY_HEADER]: env.SERVICE_KEY,
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
