import type { ErrorRequestHandler } from "express";
import { err } from "@/lib/logger";
import { HttpError } from "./errors";
import { createApiResponse } from "./responses";

const v1ErrorHandler: ErrorRequestHandler = async (error, _req, res, _next) => {
	err(error);

	if (error instanceof HttpError) {
		return res
			.status(error.statusCode)
			.json(createApiResponse.err(error.message));
	}

	res.status(500).json(createApiResponse.err("Internal server error"));
};

export { v1ErrorHandler };
