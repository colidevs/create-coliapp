import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Unit tests for pure, testable logic only (testing-methodology.md — this
 * template isn't in Strict TDD Mode's scope, but ordinary unit tests are
 * still the convention). Component tests (Storybook's Vitest addon) and
 * E2E (Playwright) land in a later phase — this config covers `node`-
 * environment logic tests only, not component rendering.
 */
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
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
});
