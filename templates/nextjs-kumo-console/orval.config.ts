import { defineConfig } from "orval";

/**
 * Contract-first codegen for the orders module (design decision D2,
 * `kumo-console-template` SDD change). Reads `openapi/openapi.yaml` and
 * emits, into `src/generated/orders/`:
 *
 * - A typed fetch client + MSW/Faker mocks (`ordersApi`), routed through the
 *   custom mutator in `src/lib/api/server-client.ts` — the single place
 *   session/tenant forwarding and `API_BASE_URL` switching happens
 *   (`.env.example`). The client and its mocks share one config
 *   deliberately: a separate mock-only config with no `client` set defaults
 *   to Orval's own axios client, generating a redundant, unused,
 *   type-error-producing axios file alongside the real one — confirmed by
 *   running this generator standalone before folding it in here.
 * - Zod schemas (`ordersZod`) mirroring the same OpenAPI schemas.
 *
 * The generated MSW mocks (`orders.msw.ts`) are Faker-based scaffolding, not
 * the actual tenant-aware handler set this template runs — that hand-written
 * set lives in `src/mocks/handlers/orders.ts` and enforces real tenant
 * scoping against `src/mocks/data/orders.ts`'s in-memory store. The
 * generated mocks are committed as Orval's own codegen artifact (per this
 * template's "generate for real, commit it" convention) but are not wired
 * into `src/mocks/node.ts`.
 *
 * Do NOT hand-edit anything under `src/generated/` — re-run
 * `pnpm generate:api` after changing `openapi/openapi.yaml` instead. The
 * generated output IS committed (this template must `next build` immediately
 * after scaffolding, with no separate codegen step expected of a consumer).
 */
export default defineConfig({
	ordersApi: {
		input: {
			target: "./openapi/openapi.yaml",
		},
		output: {
			mode: "tags-split",
			client: "fetch",
			target: "./src/generated/orders/endpoints",
			schemas: "./src/generated/orders/model",
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
					path: "./src/lib/api/server-client.ts",
					name: "apiRequest",
				},
			},
		},
	},
	ordersZod: {
		input: {
			target: "./openapi/openapi.yaml",
		},
		output: {
			mode: "tags-split",
			client: "zod",
			target: "./src/generated/orders/endpoints",
			fileExtension: ".zod.ts",
			formatter: "biome",
		},
	},
});
