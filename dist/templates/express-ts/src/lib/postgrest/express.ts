import type { NextFunction, Request, Response } from "express";
import { createPostgrestClientForRequest } from "./client";

export interface ResponseWithPostgrest extends Response {
	locals: Response["locals"] & {
		postgrest: ReturnType<typeof createPostgrestClientForRequest>;
	};
}

/**
 * @description Attaches a request-scoped PostgREST client to
 * `res.locals.postgrest`, built from THIS request's PostgREST-verifiable
 * JWT. Route/service code should call `.from("table")` on
 * `res.locals.postgrest`, matching the `.from()`-style shape
 * munod/jaulasvacias already use — never import a shared client from
 * elsewhere in this path.
 *
 * **Arc A3 correction (proposed — pending review, see `src/lib/auth.ts`)**:
 * reads `res.locals.jwt`, not `req.headers.authorization` — that header
 * carries Better Auth's opaque `bearer` session token, which PostgREST
 * cannot verify (see `./client.ts`'s doc comment). `res.locals.jwt` is only
 * populated by `src/v1/middlewares/auth.ts`'s session-checking `auth`
 * middleware, so any route needing a session-scoped, RLS-authenticated
 * PostgREST client MUST mount `auth` BEFORE this middleware
 * (`router.get(path, auth, attachPostgrestClient, handler)`). A route that
 * intentionally serves anonymous/public data may mount this middleware
 * alone — `res.locals.jwt` is then simply absent, and the resulting
 * PostgREST client carries no `Authorization` header at all, exactly like
 * an unauthenticated PostgREST request (PostgREST's own `PGRST_DB_ANON_ROLE`
 * applies).
 */
export function attachPostgrestClient(
	_req: Request,
	res: Response,
	next: NextFunction,
) {
	const jwt = (res.locals as { jwt?: string }).jwt;

	(res as ResponseWithPostgrest).locals.postgrest =
		createPostgrestClientForRequest(jwt);

	next();
}
