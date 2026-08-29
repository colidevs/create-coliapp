import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		// Defense-in-depth: also fixed at the source in `tsup.config.ts` (test
		// files are no longer bundled into `dist/` at all), but excluding
		// `dist/` here too means a stray/older build output can never be
		// picked up as a duplicate, crash-prone test suite again.
		exclude: [...configDefaults.exclude, "dist/**"],
		// Fixed value for `src/config.ts`'s `serviceAuth.key` (`SERVICE_KEY`),
		// read once at module-import time — set here (assigned to
		// `process.env` before any test file runs) rather than per-test-file,
		// since a plain `process.env.SERVICE_KEY = ...` statement placed after
		// a static `import` would run too late (module evaluation order).
		// Arc A7's `src/v1/middlewares/service-auth.ts`.
		env: {
			SERVICE_KEY: "test-service-key",
		},
	},
});
