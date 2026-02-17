import type { NextFunction, Response } from "express";
import { err, info, warn } from "@/lib/logger";
import { genCacheKey, getCache, setCache } from "@/lib/redis";
import { createApiResponse } from "@/v1/res/responses";
import type { RequestWithId, ResponseWithContext } from "@/v1/types";

const cache = async (
	req: RequestWithId,
	res: ResponseWithContext,
	next: NextFunction,
) => {
	if (req.method !== "GET" || !res.locals.context || !req.params.id) {
		warn(
			"cache middleware not work",
			"method or context or id not satisfies condition",
			`method: ${req.method}`,
			`context: ${res.locals.context}`,
			`id: ${req.params.id}`,
		);
		return next();
	}

	const { id } = req.params;
	const { context } = res.locals;

	const cacheKey = genCacheKey(id, context, `:${req.originalUrl}`);

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
