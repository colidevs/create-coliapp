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
	},
});
