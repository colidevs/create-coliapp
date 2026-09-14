import type { NextFunction, Response } from "express";
import { err, info, warn } from "@/lib/logger";
import { getCache, setCache, tenantCacheKey } from "@/lib/redis";
import { createApiResponse } from "@/v1/res/responses";
import type { RequestWithId, ResponseWithCacheContext } from "@/v1/types";

/**
 * @description Resolves the tenant ID for the current request from the
 * authenticated session's active organization — never from a client-
 * suppliable header. `res.locals.tenantId` is populated by the `auth`
 * middleware (`src/v1/middlewares/auth.ts`) from Better Auth's
 * `organization` plugin (`session.activeOrganizationId`, `src/lib/auth.ts`),
 * so this middleware only works correctly when composed AFTER `auth` on a
 * route (`auth` runs before `context`/`cache`, same order `me/route.ts`
 * already establishes for its own protected route).
 *
 * Previously read the raw, unauthenticated `x-tenant-id` request header —
 * the real, previously-open `adr0012.tenant-safe-caching` finding recorded
 * in `api-standard/findings.json`: any client could set that header to an
 * arbitrary value, including another tenant's ID, and have it accepted
 * verbatim as the Redis cache-key tenant dimension. Fixed here, not worked
 * around — caching is still skipped (fail-closed) whenever `tenantId` is
 * unresolved (no session, or a session with no active organization yet).
 */
function resolveTenantId(res: ResponseWithCacheContext): string | undefined {
	return res.locals.tenantId;
}

const cache = async (
	req: RequestWithId,
	res: ResponseWithCacheContext,
	next: NextFunction,
) => {
	const tenantId = resolveTenantId(res);

	if (
		req.method !== "GET" ||
		!res.locals.context ||
		!req.params.id ||
		!tenantId
	) {
		warn(
			"cache middleware not work",
			"method, context, id or tenantId not satisfies condition",
			`method: ${req.method}`,
			`context: ${res.locals.context}`,
			`id: ${req.params.id}`,
			`tenantId: ${tenantId}`,
		);
		return next();
	}

	const { id } = req.params;
	const { context } = res.locals;

	const cacheKey = tenantCacheKey({
		tenantId,
		resource: context,
		dims: [id, req.originalUrl],
	});

	try {
		const data = await getCache(cacheKey);

		if (data) {
			return res.status(200).json(createApiResponse.ok(data, "cache hit"));
		}

		res.locals.cacheKey = cacheKey;

		next();
	} catch (error) {
		err(error);
		next();
	}
};

async function cacheAndSend<T>(res: Response, data: T) {
	const { cacheKey } = res.locals as { cacheKey: string };

	if (cacheKey) {
		try {
			await setCache(cacheKey, data);
			info("cache ✅");
		} catch (error) {
			err(error);
		}
	}

	return res.status(200).json(createApiResponse.ok(data));
}

export { cache, cacheAndSend };
