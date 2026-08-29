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
 */
const auth = async (
	req: Request,
	res: ResponseWithSession,
	next: NextFunction,
) => {
	const session = await getAuth().api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	if (!session) {
		throw new UnauthorizedHttpError();
	}

	res.locals.session = session;

	next();
};

export { auth };
