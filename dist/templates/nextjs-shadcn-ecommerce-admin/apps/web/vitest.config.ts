import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		// Vitest's own default `include` (`**/*.{test,spec}.?(c|m)[jt]s?(x)`)
		// otherwise also matches `e2e/*.spec.ts` — Playwright's own spec files,
		// which throw ("Playwright Test did not expect test() to be called
		// here") if collected by Vitest's runner instead of Playwright's own.
		// Mirrors `nextjs-kumo-console/vitest.config.mts`'s own explicit
		// `include` scoping (that template additionally has a Storybook
		// project to keep separate; this one does not, but the same `e2e/`
		// exclusion applies).
		exclude: ["**/node_modules/**", "**/.git/**", "e2e/**"],
		// Fixed dummy values for every var `src/env.ts`'s `createEnv()` requires
		// — `@t3-oss/env-nextjs` validates at import time (ADR 0041), and `@/env`
		// is transitively pulled in by `@/lib/api` and `@/lib/get-server-session`.
		env: {
			SERVICE_KEY: "test-service-key",
			API_BASE_URL: "http://localhost:3001",
			NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
			API_MOCKING: "disabled",
		},
	},
});
