/**
 * @description RFC 9457 Problem Details (`type`/`status`/`title`/`detail`/
 * `instance`) — the mandatory error shape per ADR 0009 / `api-communication-
 * standard.md`, replacing this template's previous `{message, data}` shape
 * (2026-08-17 audit's single most-repeated finding). `errors` is the
 * documented per-field validation-failure extension, present only when
 * relevant.
 */
export interface ProblemDetails {
	type: string;
	status: number;
	title: string;
	detail?: string;
	instance?: string;
	errors?: Array<{ field: string; message: string }>;
}

abstract class AppError extends Error {
	constructor(message?: string) {
		super(message ?? "");
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * @description `type` MUST be a URI reference per RFC 9457 §3.1 — `about:
 * blank` is the explicit default for errors with no dedicated documentation
 * page, exactly as the RFC allows ("about:blank" indicates the problem has
 * no additional semantics beyond the HTTP status code). Subclasses below
 * override it with a real `https://coli.dev/errors/...` slug once one
 * exists; otherwise they inherit this default rather than inventing an
 * unresolvable URI.
 */
export class HttpError extends AppError {
	constructor(
		public statusCode: number,
		message: string,
		public type: string = "about:blank",
		public errors?: Array<{ field: string; message: string }>,
	) {
		super(message);
	}

	toProblemDetails(instance?: string): ProblemDetails {
		return {
			type: this.type,
			status: this.statusCode,
			title: this.message,
			detail: this.message,
			...(instance ? { instance } : {}),
			...(this.errors ? { errors: this.errors } : {}),
		};
	}
}

export class InternalServerError extends HttpError {
	constructor() {
		super(500, "Internal error");
	}
}

export class UnexpectedError extends AppError {
	message = "Unexpected error, create a new AppError";
}

export class NotImplementedError extends AppError {
	message = "Not implemented error";
}

export class RequiredError extends AppError {
	constructor(public paramName: string) {
		super(`${paramName} is required`);
	}
}

export class UnauthorizedHttpError extends HttpError {
	constructor() {
		super(
			401,
			"Unauthorized, invalid credentials",
			"https://coli.dev/errors/unauthorized",
		);
	}
}

export class AccessDeniedInactiveResourceHttpError extends HttpError {
	constructor() {
		super(
			403,
			"Access denied. The account associated with this resource is inactive",
			"https://coli.dev/errors/inactive-resource",
		);
	}
}

export class NotAllowedMethod extends HttpError {
	constructor() {
		super(
			405,
			"This endpoint only supports POST requests",
			"https://coli.dev/errors/method-not-allowed",
		);
	}
}

export class ParseHttpError extends HttpError {
	constructor() {
		super(
			502,
			"DATA_SOURCE_PARSE_ERROR",
			"https://coli.dev/errors/upstream-parse-error",
		);
	}
}

export class NotFoundHttpError extends HttpError {
	constructor(public msg?: string) {
		super(
			404,
			`Resource not found. ${msg ?? ""}`.trim(),
			"https://coli.dev/errors/not-found",
		);
	}
}

/**
 * @description Per-field validation failure, the RFC 9457 `errors[]`
 * extension. `status` is 422 (semantically invalid), per ADR 0009's status
 * code split — not 400, which this codebase reserves for transport/syntax
 * failures.
 */
export class ValidationHttpError extends HttpError {
	constructor(errors: Array<{ field: string; message: string }>) {
		super(
			422,
			"One or more fields failed validation",
			"https://coli.dev/errors/validation",
			errors,
		);
	}
}

export class EnvironmentError extends AppError {
	constructor(
		public envKey: string,
		public exampleValue?: string,
	) {
		super(
			`env with key ${envKey} is required${exampleValue ? ` e.g ${exampleValue}` : ""}`,
		);
	}
}

export class InfraError extends AppError {
	constructor(
		public node: string,
		message: string,
	) {
		super(message);
		this.message = `${node}: ${message}`;
	}
}
