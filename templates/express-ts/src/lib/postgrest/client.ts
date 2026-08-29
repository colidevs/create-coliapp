import { PostgrestClient } from "@supabase/postgrest-js";
import { config } from "@/config";
import { EnvironmentError } from "@/v1/res/errors";

/**
 * @description Supabase-hosted data-access path (ADR 0014 / design D4
 * alternate track). RLS role-switching in PostgREST is driven entirely by
 * the JWT it receives per request (PostgREST resolves the Postgres role
 * from the token's `role` claim and sets `request.jwt.claims` for the
 * duration of that one request/transaction) — this is PostgREST's job, not
 * something this client re-implements.
 *
 * The critical requirement this module exists to satisfy: build a FRESH
 * `PostgrestClient` per request, with THAT request's `Authorization` header
 * forwarded — never a single module-level client constructed once with a
 * static service-role key. A shared static client would authenticate every
 * request as the same role (commonly the service role, which bypasses RLS
 * entirely), defeating tenant isolation regardless of how correct the RLS
 * policies themselves are.
 *
 * **Arc A3 correction (proposed — pending review, see `src/lib/auth.ts`)**:
 * this now takes the request's PostgREST-verifiable JWT directly (minted by
 * `src/v1/middlewares/auth.ts` via Better Auth's `jwt` plugin), not the raw
 * incoming `Authorization` header. Better Auth's `bearer` plugin issues
 * opaque session tokens — forwarding one of those verbatim (this module's
 * pre-Arc-A3 behavior) would give PostgREST a string it cannot verify a
 * signature on or read a `role` claim from, so it would silently fall back
 * to `PGRST_DB_ANON_ROLE` instead of the caller's real role. `jwt: undefined`
 * (no session, e.g. an intentionally anonymous route) still produces a
 * valid, unauthenticated PostgREST client — matching PostgREST's own
 * anon-role behavior on a request with no `Authorization` header at all.
 */
export function createPostgrestClientForRequest(
	jwt: string | undefined,
): PostgrestClient {
	const url = config.postgrest.url;

	if (!url) {
		throw new EnvironmentError(
			"POSTGREST_URL",
			"https://<project>.supabase.co/rest/v1",
		);
	}

	return new PostgrestClient(url, {
		headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
	});
}
