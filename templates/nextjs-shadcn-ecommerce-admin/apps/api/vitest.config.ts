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
		// Fixed dummy values for every var `src/config.ts`'s ADR 0041
		// `envSchema.safeParse()` requires, read once at module-import time —
		// set here (assigned to `process.env` before any test file runs)
		// rather than per-test-file, since a plain `process.env.X = ...`
		// statement placed after a static `import` would run too late
		// (module evaluation order). Since `envSchema.safeParse()` throws
		// synchronously at import time on any missing/invalid var (never
		// lazily), every one of these must be present for the test suite to
		// import `@/config` (transitively pulled in by nearly every module,
		// including `@/api`) at all — none of these values are read by a
		// live dependency during tests, only parsed for shape.
		env: {
			SERVICE_KEY: "test-service-key",
			DATABASE_RUNTIME_URL: "postgres://app_runtime:test@localhost:5432/test",
			DATABASE_OWNER_URL: "postgres://app_owner:test@localhost:5432/test",
			BETTER_AUTH_SECRET: "test-better-auth-secret-32-characters-min",
			BETTER_AUTH_URL: "http://localhost:3001",
			CORS_ALLOWED_ORIGINS: "http://localhost:3000",
			SECRET_KEY:
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
			DLOCAL_API_URL: "https://api-sbx.dlocalgo.com/v1/payments",
			DLOCAL_API_KEY: "test-dlocal-api-key",
			DLOCAL_API_SECRET: "test-dlocal-api-secret",
			DLOCAL_NOTIFICATION_URL: "http://localhost:3001/api/v1/dlocal/notifications",
			DLOCAL_SUCCESS_URL: "http://localhost:3000/checkout/return",
			DLOCAL_BACK_URL: "http://localhost:3000/checkout",
			DLOCAL_DEFAULT_CURRENCY: "USD",
			DLOCAL_DEFAULT_COUNTRY: "US",
		},
	},
});
