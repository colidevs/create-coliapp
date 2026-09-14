import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * ADR 0041 (`.claude/rules/frontend-typescript-conventions.md`, "Environment
 * variable validation at boot") — `@t3-oss/env-nextjs`'s `server`/`client`
 * split, not a hand-rolled schema, since Next's server-env vs.
 * `NEXT_PUBLIC_*`-client-env split is exactly the footgun that library is
 * built to solve. Fails fast at import time by default; `skipValidation` is
 * never passed here.
 *
 * `SERVICE_KEY` (server-only, `src/lib/api.ts`'s `apiRequest` mutator) MUST
 * NEVER be exposed as a `NEXT_PUBLIC_*` var — it authenticates this app to
 * `apps/api` as a trusted service caller (`src/v1/middlewares/service-auth.ts`
 * in that app), matching the `x-service-key` scheme, not Basic-auth `btoa`
 * (a deliberate departure from munod's `lib/api.ts`, per this template's own
 * design).
 */
export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		API_BASE_URL: z.url().default("http://localhost:3001"),
		SERVICE_KEY: z.string().min(1),
		API_MOCKING: z.enum(["enabled", "disabled"]).default("enabled"),
	},
	client: {
		NEXT_PUBLIC_API_BASE_URL: z.url().default("http://localhost:3001"),
	},
	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		API_BASE_URL: process.env.API_BASE_URL,
		SERVICE_KEY: process.env.SERVICE_KEY,
		API_MOCKING: process.env.API_MOCKING,
		NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
	},
});
