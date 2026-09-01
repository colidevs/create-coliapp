import { z } from "zod";

/**
 * @description Response schema for `GET /me`, the Zod source of truth
 * `scripts/generate-openapi.ts` generates `openapi/openapi.yaml` from
 * (ADR 0040, superseding ADR 0005 — `.claude/rules/api-design-apidog.md`).
 * Keep this in sync with `getMe`'s actual response shape in
 * `./controller.ts` — nothing derives one from the other automatically.
 */
export const MeResponseSchema = z
	.object({
		id: z.string().meta({ example: "usr_01hz8p7q9k2m3n4p5q6r7s8t9u" }),
		email: z.email().meta({ example: "jane@example.com" }),
	})
	.meta({ id: "MeResponse" });
