import { z } from "zod";

/**
 * @description RFC 9457 Problem Details (ADR 0009 / `api-communication-
 * standard.md`) as a Zod schema — the OpenAPI-generation-time counterpart to
 * `ProblemDetails` in `./errors.ts`, consumed by `scripts/generate-
 * openapi.ts` (ADR 0040, superseding ADR 0005 —
 * `.claude/rules/api-design-apidog.md`).
 *
 * Kept as its own module rather than merged into `errors.ts` so the
 * generation script can import just the schema without pulling in the full
 * `AppError`/`HttpError` class hierarchy. `ProblemDetails` stays a
 * hand-written `interface` (not itself a Zod schema) — update both by hand
 * whenever the shape changes; no derivation mechanism links them today.
 */
export const ProblemSchema = z
	.object({
		type: z.string().meta({
			format: "uri-reference",
			description: "A URI reference identifying the problem type.",
			example: "https://coli.dev/errors/not-found",
		}),
		status: z.number().int().meta({ example: 404 }),
		title: z.string().meta({ example: "Resource not found." }),
		detail: z.string().optional().meta({
			example: "Resource not found. order 1",
		}),
		instance: z.string().optional().meta({
			example: "/api/v1/orders/1",
		}),
		errors: z
			.array(
				z.object({
					field: z.string().meta({ example: "email" }),
					message: z.string().meta({ example: "must be a valid email" }),
				}),
			)
			.optional(),
	})
	.meta({ id: "Problem" });
