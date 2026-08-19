import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config (testing-methodology.md: "Playwright — end-to-end
 * testing. Not Cypress."). Runs against a real `next dev` server this config
 * starts itself (`webServer`), with MSW as the backend
 * (design decision D2) — **not** a real `express-ts` instance, so `env`
 * below explicitly sets `API_MOCKING=enabled` rather than relying on
 * whatever a developer's own `.env.local` happens to hold. This is the one
 * real trap this phase's spec calls out: a run that silently hit a real,
 * non-existent `express-ts` backend would fail for the wrong reason.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
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
		// The dev server, not a production build+start — this phase's spec
		// scenario is explicitly "runs against the local dev server with MSW
		// active" (src/instrumentation.ts's register() hook starts MSW's Node
		// server the same way in dev or prod; dev is simply the faster, more
		// direct match for what this config is meant to exercise).
		command: "pnpm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000,
		env: {
			API_MOCKING: "enabled",
			API_BASE_URL: "http://localhost:3000",
			THUMBOR_BASE_URL: "https://images.colidevs.com",
			THUMBOR_SECURITY_KEY: "e2e-placeholder-security-key",
		},
	},
});
