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
	},
});
