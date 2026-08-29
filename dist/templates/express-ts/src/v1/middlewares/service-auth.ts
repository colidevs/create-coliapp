import { verifyStaticServiceKey } from "@colidevs/api-kit/service-auth";
import type { NextFunction, Request, Response } from "express";
import { config } from "@/config";
import { UnauthorizedHttpError } from "@/v1/res/errors";

const SERVICE_KEY_HEADER = "x-service-key";

/**
 * @description Service-to-service static-API-key auth (ADR 0009's carve-out
 * — "Static API key acceptable only for service-to-service calls with no
 * per-tenant user context"), per hefesto's `docs/backlog/
 * e2e-buildable-toolset-plan.md` Arc A7. Gates every `/api/v1` route
 * (mounted on `v1Router`, `src/v1/route.ts`) — coarser than, and independent
 * of, any per-route Better Auth session check (`src/v1/middlewares/auth.ts`):
 * a caller needs a valid service key on EVERY `/api/v1` request regardless
 * of whether that specific route also requires a human session.
 *
 * Deliberately builds on `@colidevs/api-kit/service-auth`'s
 * `verifyStaticServiceKey` (the pure, constant-time comparison function),
 * not that same package's `requireStaticServiceKey` Express adapter — that
 * adapter writes its own generic `{type: "about:blank", ...}` 401 body
 * directly via `res.status(401).json(...)`, bypassing `next(err)` entirely,
 * which would make it impossible to route failures through this template's
 * own RFC 9457 `v1ErrorHandler` (`src/v1/res/error-handler.ts`) the way
 * every other auth failure in this app is shaped. Throwing
 * `UnauthorizedHttpError` here instead keeps one single error-shaping path
 * for the whole app.
 */
const serviceAuth = (req: Request, _res: Response, next: NextFunction) => {
	const rawValue = req.headers[SERVICE_KEY_HEADER];
	const providedKey = Array.isArray(rawValue) ? rawValue[0] : rawValue;

	const isValid = verifyStaticServiceKey(providedKey, {
		expectedKey: config.serviceAuth.key,
	});

	if (!isValid) {
		throw new UnauthorizedHttpError();
	}

	next();
};

export { serviceAuth };
