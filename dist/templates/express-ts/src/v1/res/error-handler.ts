import type { ErrorRequestHandler } from "express";
import { err } from "@/lib/logger";
import { HttpError, type ProblemDetails } from "./errors";

/**
 * @description Duck-typed shape of `express-openapi-validator`'s own
 * `HttpError` (`node_modules/express-openapi-validator/dist/framework/
 * types.js`) — a plain `Error` subclass with `status`/`message`/`errors`
 * (each `{ path, message }`), NOT an instance of this template's own
 * `HttpError` class. Found by actually exercising the validator against an
 * undocumented route (task 3.9's contract-regression test caught this: it
 * was silently falling through to the generic 500 fallback below instead of
 * the validator's real 404/400/etc. status).
 */
interface OpenApiValidatorError {
	status: number;
	message: string;
	errors?: Array<{ path?: string; message: string }>;
}

function isOpenApiValidatorError(
	error: unknown,
): error is OpenApiValidatorError {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof (error as { status: unknown }).status === "number" &&
		"message" in error
	);
}

/**
 * @description Emits RFC 9457 Problem Details (ADR 0009) with the
 * `application/problem+json` media type, replacing the previous
 * `{message, data}` shape. `instance` is set to the request's own URL —
 * RFC 9457 §3.1 recommends a URI reference identifying the SPECIFIC
 * occurrence of the problem, which the request path satisfies well enough
 * for this template without inventing a dedicated per-error-instance ID
 * scheme.
 */
const v1ErrorHandler: ErrorRequestHandler = async (error, req, res, _next) => {
	err(error);

	if (error instanceof HttpError) {
		const problem = error.toProblemDetails(req.originalUrl);

		return res
			.status(error.statusCode)
			.type("application/problem+json")
			.json(problem);
	}

	if (isOpenApiValidatorError(error)) {
		const problem: ProblemDetails = {
			type: "https://coli.dev/errors/openapi-validation",
			status: error.status,
			title: error.message,
			detail: error.message,
			instance: req.originalUrl,
			...(error.errors
				? {
						errors: error.errors.map((item) => ({
							field: item.path ?? "unknown",
							message: item.message,
						})),
					}
				: {}),
		};

		return res
			.status(error.status)
			.type("application/problem+json")
			.json(problem);
	}

	const fallback: ProblemDetails = {
		type: "about:blank",
		status: 500,
		title: "Internal server error",
		instance: req.originalUrl,
	};

	res.status(500).type("application/problem+json").json(fallback);
};

export { v1ErrorHandler };
