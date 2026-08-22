import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * Two Vitest "projects" (Vitest's own multi-config mechanism), per
 * testing-methodology.md:
 *
 * - `node`-environment unit tests for pure, testable logic only (this
 *   template isn't in Strict TDD Mode's scope, but ordinary unit tests are
 *   still the convention).
 * - A `storybook` browser project, wired via `@storybook/addon-vitest` —
 *   the current official mechanism for running Storybook's stories (and
 *   their `play` functions) as component tests (testing-methodology.md /
 *   frontend-accessibility-baseline.md's `@storybook/addon-a11y`), superseding
 *   the older, separate `test-storybook` CLI. Runs on real Chromium via
 *   `@vitest/browser-playwright`. E2E (Playwright, whole-app) is a separate,
 *   later concern — see `e2e/*.spec.ts` + `playwright.config.ts`.
 *
 * More info: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
 */
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					environment: "node",
					// `scripts/**/*.test.ts` added for the `frontend-standard-check`
					// SDD change (hefesto, Phase 4): `scripts/frontend-standard-gate.mjs`
					// and its test file live outside `src/` on purpose, mirroring
					// `templates/express-ts/scripts/api-standard-gate.mjs`'s own
					// placement — a gate script is infrastructure, not application code.
					include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
					server: {
						deps: {
							// @colidevs/utils@0.1.0's published dist/index.js omits file
							// extensions on its own relative re-exports (`export * from
							// "./aip160-filter"` instead of "./aip160-filter.js") — a
							// pre-existing bug in that package's own build, confirmed against
							// the published tarball, not something introduced here. Node's
							// native ESM resolver (what Vitest uses for externalized
							// node_modules deps by default) rejects extensionless specifiers;
							// inlining routes it through Vite's own, more permissive resolver
							// instead. Remove this once the upstream package fixes its build.
							inline: ["@colidevs/utils"],
						},
					},
				},
			},
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(import.meta.dirname, ".storybook"),
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [
							{
								browser: "chromium",
							},
						],
					},
				},
			},
		],
	},
});
