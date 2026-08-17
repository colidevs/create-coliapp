import type { NextFunction, Request, Response } from "express";
import { createPostgrestClientForRequest } from "./client";

export interface ResponseWithPostgrest extends Response {
	locals: Response["locals"] & {
		postgrest: ReturnType<typeof createPostgrestClientForRequest>;
	};
}

/**
 * @description Attaches a request-scoped PostgREST client to
 * `res.locals.postgrest`, built from THIS request's `Authorization` header.
 * Mount before any route handler that queries via PostgREST. Route/service
 * code should call `.from("table")` on `res.locals.postgrest`, matching the
 * `.from()`-style shape munod/jaulasvacias already use — never import a
 * shared client from elsewhere in this path.
 */
export function attachPostgrestClient(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	(res as ResponseWithPostgrest).locals.postgrest =
		createPostgrestClientForRequest(req.headers.authorization);

	next();
}
