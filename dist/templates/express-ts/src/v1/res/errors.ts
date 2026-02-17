abstract class AppError extends Error {
	constructor(message?: string) {
		super(message ?? "");
		this.name = this.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class HttpError extends AppError {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
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
		super(401, "Unauthorized, invalid credentials");
	}
}

export class AccessDeniedInactiveResourceHttpError extends HttpError {
	constructor() {
		super(
			403,
			"Access denied. The account associated with this resource is inactive",
		);
	}
}

export class NotAllowedMethod extends HttpError {
	constructor() {
		super(405, "This endpoint only supports POST requests");
	}
}

export class ParseHttpError extends HttpError {
	constructor() {
		super(502, "DATA_SOURCE_PARSE_ERROR");
	}
}

export class NotFoundHttpError extends HttpError {
	constructor(public msg?: string) {
		super(404, `Resource not found. ${msg}`);
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
