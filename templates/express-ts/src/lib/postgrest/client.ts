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
 */
export function createPostgrestClientForRequest(
	authorizationHeader: string | undefined,
): PostgrestClient {
	const url = config.postgrest.url;

	if (!url) {
		throw new EnvironmentError(
			"POSTGREST_URL",
			"https://<project>.supabase.co/rest/v1",
		);
	}

	return new PostgrestClient(url, {
		headers: authorizationHeader ? { Authorization: authorizationHeader } : {},
	});
}
