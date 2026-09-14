import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config (testing-methodology.md: "Playwright — end-to-end
 * testing. Not Cypress."). Adapted from `templates/nextjs-kumo-console/
 * playwright.config.ts` — same shape (a `next dev` server this config starts
 * itself, MSW as the backend via `API_MOCKING=enabled`), for this template's
 * one storefront E2E scenario (`e2e/checkout-flow.spec.ts`).
 *
 * Not wired by Phase 5 (infra only, zero page/E2E content) despite
 * `.github/workflows/frontend-standard.yml`'s `e2e` job already expecting
 * `pnpm run test:e2e` to exist — this is that gap, closed now that a real
 * flow exists to test (task 6.6).
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// `exactOptionalPropertyTypes` (ADR 0030) rejects `workers: undefined` —
	// conditionally spread the key instead of always assigning it.
	...(process.env.CI ? { workers: 1 } : {}),
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000,
		env: {
			API_MOCKING: "enabled",
			API_BASE_URL: "http://localhost:3000",
			SERVICE_KEY: "e2e-placeholder-service-key",
			NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
		},
	},
});
