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
