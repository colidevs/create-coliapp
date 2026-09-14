import type { NextFunction } from "express";
import type { RequestWithId, ResponseWithContext } from "@/v1/types";

const context = async (
	req: RequestWithId,
	res: ResponseWithContext,
	next: NextFunction,
) => {
	const module = req.originalUrl.split("/")[3];

	res.locals.context = module;

	next();
};

export { context };
