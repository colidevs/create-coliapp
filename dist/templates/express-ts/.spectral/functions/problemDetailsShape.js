/**
 * @description ADR 0009 (`api-communication-standard.md`): every error response
 * (4xx/5xx/`default`) must use RFC 9457 Problem Details over
 * `application/problem+json`, not a flat `{message, data}`/`{error}` shape.
 * Runs against every response object under an operation; skips 2xx/3xx
 * responses since those are success shapes, not the target of this rule.
 */
export default function problemDetailsShape(response, _opts, context) {
	const key = String(context.path[context.path.length - 1]);
	const isErrorResponse = key === "default" || /^[45]\d\d$/.test(key);

	if (!isErrorResponse) {
		return;
	}

	const content = response?.content?.["application/problem+json"];

	if (!content) {
		return [
			{
				message:
					"Error responses must use the application/problem+json media type (RFC 9457, ADR 0009).",
			},
		];
	}

	const required = content.schema?.required ?? [];
	const hasRequiredProblemFields = ["type", "status", "title"].every((field) =>
		required.includes(field),
	);

	if (!hasRequiredProblemFields) {
		return [
			{
				message:
					"Error response schema must require type, status, and title (RFC 9457 Problem Details, ADR 0009).",
			},
		];
	}
}
