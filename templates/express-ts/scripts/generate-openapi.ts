/**
 * @description Invoked via the `tsx` CLI (`pnpm generate:openapi`,
 * `pnpm generate:openapi:check` — see `package.json`), never `node`
 * directly: it imports `.ts` modules and this template's `@/*` path alias
 * (`tsconfig.json`), both of which `tsx` resolves out of the box.
 *
 * Generates `openapi/openapi.yaml` from this template's Zod
 * schemas via `zod-openapi` — colidevs' code-first OpenAPI standard
 * (hefesto ADR 0040, superseding ADR 0005's Apidog-first design mandate;
 * see `.claude/rules/api-design-apidog.md`). Zod schemas
 * (`src/v1/modules/**\/types.ts`, `src/v1/res/problem-schema.ts`) are the
 * source of truth — `openapi/openapi.yaml` is a generated artifact. Do not
 * hand-edit it; edit the schema/route wiring below (and the imported
 * `types.ts` modules) instead, then re-run `pnpm generate:openapi`.
 *
 * `--check` (wired as `pnpm generate:openapi:check`, and into
 * `.github/workflows/api-standard.yml`): regenerates the document in memory
 * and diffs it byte-for-byte against the committed file without writing
 * anything — ADR 0040's 2026-08-31 addendum ("generate-and-diff
 * verification is mandatory, not implied"). Exits non-zero the moment the
 * committed file has drifted from what the current schemas would produce.
 *
 * Deliberately deterministic: no timestamps, no machine-specific paths, no
 * randomised key order in the emitted document — the same schemas must
 * always produce byte-identical YAML, or the `--check` mode is meaningless.
 *
 * New paths/schemas are added here as this template's real API grows —
 * this file's own `buildDocument()` is the one place `openapi/openapi.yaml`
 * is assembled from, mirroring how `drizzle-kit generate` treats
 * `drizzle/*.sql` as generated output of `src/lib/db/schema.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { createDocument } from "zod-openapi";
import { HealthcheckStatusResponseSchema } from "@/v1/modules/healthcheck/types";
import { MeResponseSchema } from "@/v1/modules/me/types";
import { ProblemSchema } from "@/v1/res/problem-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(__dirname, "../openapi/openapi.yaml");

const GENERATED_FILE_HEADER = `# GENERATED FILE — DO NOT EDIT BY HAND.
#
# Produced by \`pnpm generate:openapi\` (\`scripts/generate-openapi.ts\`) from
# this template's Zod schemas via \`zod-openapi\` — colidevs' code-first
# OpenAPI standard (hefesto ADR 0040, superseding ADR 0005's Apidog-first
# design mandate; see \`.claude/rules/api-design-apidog.md\`). To change this
# document, edit the Zod schemas (\`src/v1/modules/**/types.ts\`,
# \`src/v1/res/problem-schema.ts\`) and/or the route wiring in
# \`scripts/generate-openapi.ts\`, then re-run the generator.
#
# \`pnpm generate:openapi:check\` (wired into
# \`.github/workflows/api-standard.yml\`) fails the build the moment this
# file drifts from a fresh regeneration — ADR 0040's 2026-08-31 addendum.
`;

function buildDocument() {
	return createDocument({
		openapi: "3.1.0",
		info: {
			title: "{{name}}",
			version: "1.0.0",
			description:
				"Minimal starter spec for this template's existing endpoints, generated from its Zod schemas (ADR 0040). Extend the schema/route modules this script imports as the project's real API contract grows — never hand-edit this file.",
		},
		servers: [{ url: "/api/v1" }],
		components: {
			schemas: {
				Problem: ProblemSchema,
			},
			securitySchemes: {
				// Better Auth session cookie (ADR 0022) — read via
				// `fromNodeHeaders`/`getAuth().api.getSession` in
				// `src/v1/middlewares/auth.ts`, never an `Authorization: Bearer`
				// header, for this template's default same-root-domain topology.
				sessionCookie: {
					type: "apiKey",
					in: "cookie",
					name: "better-auth.session_token",
				},
				// OAuth2 Bearer (ADR 0009), kept available for a cross-root-domain
				// deployment using ADR 0036's escape hatch — not the default `/me`
				// scheme above.
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
				// Service-to-service static-key auth (ADR 0009's carve-out).
				// Enforced at runtime by `src/v1/middlewares/service-auth.ts` on
				// every `/api/v1` operation regardless of what a given route's own
				// `security` array declares — declared here only as a documented,
				// AND-combined requirement on `/me` below.
				apiKeyAuth: {
					type: "apiKey",
					in: "header",
					name: "x-service-key",
				},
			},
		},
		paths: {
			"/healthcheck/status": {
				get: {
					operationId: "getHealthcheckStatus",
					summary: "Application-level healthcheck status",
					security: [],
					responses: {
						"200": {
							description: "Healthcheck status message",
							content: {
								"application/json": {
									schema: HealthcheckStatusResponseSchema,
								},
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/me": {
				get: {
					operationId: "getMe",
					summary: "Current authenticated caller",
					description:
						"Returns the caller's own identity, resolved from the Better Auth session (`src/lib/auth.ts` / `src/v1/middlewares/auth.ts`). Requires both a valid session cookie AND the service-to-service static key (`x-service-key`) — see the `sessionCookie`/`apiKeyAuth` security schemes.",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The authenticated caller's identity",
							content: {
								"application/json": { schema: MeResponseSchema },
							},
						},
						"401": {
							description: "Missing or invalid session",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
		},
	});
}

function render(): string {
	const document = buildDocument();
	const yaml = stringify(document, { aliasDuplicateObjects: false });
	return `${GENERATED_FILE_HEADER}\n${yaml}`;
}

function main() {
	const checkOnly = process.argv.includes("--check");
	const rendered = render();

	if (!checkOnly) {
		writeFileSync(OPENAPI_PATH, rendered, "utf-8");
		console.log(`Generated ${path.relative(process.cwd(), OPENAPI_PATH)}`);
		return;
	}

	let committed: string;
	try {
		committed = readFileSync(OPENAPI_PATH, "utf-8");
	} catch {
		console.error(
			`generate:openapi:check — ${OPENAPI_PATH} does not exist. Run \`pnpm generate:openapi\` first.`,
		);
		process.exitCode = 1;
		return;
	}

	if (committed !== rendered) {
		console.error(
			"generate:openapi:check — openapi/openapi.yaml is stale: it does not " +
				"match what `pnpm generate:openapi` produces from the current Zod " +
				"schemas. Run `pnpm generate:openapi` and commit the result.",
		);
		process.exitCode = 1;
		return;
	}

	console.log("openapi/openapi.yaml is up to date.");
}

main();
