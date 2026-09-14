import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request } from "express";
import { getAuth } from "@/lib/auth";
import { UnauthorizedHttpError } from "@/v1/res/errors";
import type { ResponseWithSession } from "@/v1/types";

/**
 * @description Replaces this template's previous HTTP Basic Auth (Phase 4
 * of `docs/backlog/api-standard-real-world-audit.md`'s Phase-numbered
 * findings — see `src/__tests__/adr-audit-regression.test.ts`) with a real
 * Better Auth session check, per hefesto's `docs/backlog/
 * e2e-buildable-toolset-plan.md` Arc A1/A2. Verifies the request via Better
 * Auth's own standard Node/Express server-side session-check pattern
 * (`auth.api.getSession`, fed the request's headers via `better-auth/node`'s
 * `fromNodeHeaders`), attaches the resolved session to `res.locals.session`
 * for downstream handlers, and calls `next()` — or raises the existing RFC
 * 9457 `UnauthorizedHttpError` (401) on a missing/invalid session.
 *
 * **Arc A3 addition (proposed — pending review, see `src/lib/auth.ts`)**:
 * once the session is confirmed valid, also mints a short-lived,
 * PostgREST-verifiable JWT for THIS SAME session via `auth.api.getToken()`
 * (the `jwt` plugin's server-side API — same headers, so it resolves the
 * identical session; it throws `UNAUTHORIZED` internally if it somehow
 * doesn't, which is acceptable here since we already know the session was
 * valid a moment ago) and attaches it to `res.locals.jwt`, alongside
 * `res.locals.session`. Only Better Auth's own opaque bearer token ever
 * reaches this middleware from the client — the JWT is a server-minted,
 * internal credential for the PostgREST bridge, never exposed back to the
 * caller.
 *
 * Also attaches `res.locals.tenantId` — the `organization` plugin's
 * `session.activeOrganizationId` (see `src/lib/auth.ts`), i.e. the real,
 * authenticated tenant identifier. This is the source
 * `src/v1/middlewares/cache.ts`'s `resolveTenantId()` now reads instead of
 * the raw, client-controlled `x-tenant-id` header — closes the
 * `adr0012.tenant-safe-caching` finding in `api-standard/findings.json`.
 */
const auth = async (
	req: Request,
	res: ResponseWithSession,
	next: NextFunction,
) => {
	const headers = fromNodeHeaders(req.headers);
	const session = await getAuth().api.getSession({ headers });

	if (!session) {
		throw new UnauthorizedHttpError();
	}

	const { token } = await getAuth().api.getToken({ headers });

	res.locals.session = session;
	res.locals.jwt = token;
	// Kysely/pg maps a nullable column to `string | null`, not `| undefined` —
	// `?? undefined` normalizes it to this template's existing "absent"
	// convention (`res.locals.tenantId?: string`, matching `RequestWithId`'s
	// `id?: string`), never treating `null` and "unset" as different states.
	res.locals.tenantId = session.session.activeOrganizationId ?? undefined;

	next();
};

export { auth };
