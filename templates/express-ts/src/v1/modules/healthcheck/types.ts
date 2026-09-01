import { z } from "zod";

export interface HealthcheckService {
	status: () => string;
}

/**
 * @description Response schema for `GET /healthcheck/status`, the Zod
 * source of truth `scripts/generate-openapi.ts` generates
 * `openapi/openapi.yaml` from (ADR 0040, superseding ADR 0005 —
 * `.claude/rules/api-design-apidog.md`). Keep this in sync with
 * `createHealthcheckController`'s actual response shape in `./controller.ts`
 * — nothing derives one from the other automatically.
 */
export const HealthcheckStatusResponseSchema = z
	.object({
		msg: z.string().meta({
			description: "Healthcheck status message",
			example: "V1 Healthcheck Status OK ✅",
		}),
	})
	.meta({ id: "HealthcheckStatusResponse" });
