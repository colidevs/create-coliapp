import type { NextFunction, Response } from "express";
import { err, info, warn } from "@/lib/logger";
import { getCache, setCache, tenantCacheKey } from "@/lib/redis";
import { createApiResponse } from "@/v1/res/responses";
import type { RequestWithId, ResponseWithContext } from "@/v1/types";

/**
 * @description Resolves the tenant ID for the current request. This reads
 * the `x-tenant-id` header as an interim resolution hook until a dedicated
 * tenant-context middleware lands (see ADR 0014 / RLS session pattern);
 * caching is skipped (fail-closed) whenever it cannot be resolved.
 */
function resolveTenantId(req: RequestWithId): string | undefined {
	const header = req.headers["x-tenant-id"];

	return Array.isArray(header) ? header[0] : header;
}

const cache = async (
	req: RequestWithId,
	res: ResponseWithContext,
	next: NextFunction,
) => {
	const tenantId = resolveTenantId(req);

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
