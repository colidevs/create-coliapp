import type { Request } from "express";
import type { ResponseWithSession } from "@/v1/types";

/**
 * @description Minimal authenticated-caller endpoint, gated by the
 * `auth` middleware (`src/v1/middlewares/auth.ts`) — the concrete route
 * that proves the Better Auth session check actually gates something, not
 * just a middleware that exists but is never wired to any route.
 */
export async function getMe(_req: Request, res: ResponseWithSession) {
	const { user } = res.locals.session;

	res.status(200).json({ id: user.id, email: user.email });
}
