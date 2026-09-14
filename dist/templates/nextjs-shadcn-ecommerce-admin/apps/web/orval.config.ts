import { defineConfig } from "orval";

/**
 * Contract-first codegen (ADR 0040, `.claude/rules/api-design-apidog.md`),
 * mirroring `templates/nextjs-kumo-console/orval.config.ts`'s own shape.
 * Reads `apps/api`'s real, generated `openapi/openapi.yaml` (the same
 * monorepo, one relative path away — no copy, no cross-repo fetch) and
 * emits, into `src/generated/`:
 *
 * - A typed fetch client + MSW/Faker mocks, routed through
 *   `src/lib/api.ts`'s `apiRequest` mutator — the one place the
 *   `x-service-key` header and `API_BASE_URL` both live.
 * - Zod schemas mirroring the same OpenAPI schemas.
 *
 * One config generates both the client+mocks and the Zod schemas from the
 * same input (kumo-console's own documented reason: a separate mock-only
 * config with no `client` set defaults to Orval's axios client, generating a
 * redundant, unused, type-error-producing axios file alongside the real
 * one).
 *
 * Unlike kumo-console (one hand-written domain, `orders`, with its own
 * hand-authored tenant-aware MSW handlers), this template has no page
 * content yet (Phase 5 is infra only) — `src/mocks/node.ts` wires the
 * Orval-generated Faker-based MSW mocks directly for every tag as the
 * default dev backend. A future phase MAY replace any one tag's generated
 * mock with a hand-written, realistic fixture set the same way kumo-console
 * does for `orders`, without needing to touch this config.
 *
 * Do NOT hand-edit anything under `src/generated/` — re-run
 * `pnpm generate:api` after changing `apps/api/openapi/openapi.yaml`
 * instead.
 */
export default defineConfig({
	ecommerceApi: {
		input: {
			target: "../api/openapi/openapi.yaml",
		},
		output: {
			mode: "tags-split",
			client: "fetch",
			target: "./src/generated/endpoints",
			schemas: "./src/generated/model",
			indexFiles: true,
			formatter: "biome",
			// The spec's `servers: - url: /api/v1` entry (ADR 0009 URL-path
			// versioning) is otherwise dropped from generated request paths —
			// Orval only reads `servers` when explicitly told to via this option.
			baseUrl: { getBaseUrlFromSpecification: true },
			mock: {
				generators: [{ type: "msw" }],
			},
			override: {
				mutator: {
					path: "./src/lib/api.ts",
					name: "apiRequest",
				},
			},
		},
	},
	ecommerceZod: {
		input: {
			target: "../api/openapi/openapi.yaml",
		},
		output: {
			mode: "tags-split",
			client: "zod",
			target: "./src/generated/endpoints",
			fileExtension: ".zod.ts",
			formatter: "biome",
		},
	},
});
