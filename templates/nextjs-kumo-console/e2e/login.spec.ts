import { expect, test } from "@playwright/test";

/**
 * Spec scenario 1: login flow → lands on `/orders`. Also proves the
 * `proxy.ts` → `/login?from=...` → `signInDemoAction` round trip: an
 * unauthenticated visit to a protected route redirects to `/login` with the
 * original path preserved in `?from=`, and signing in redirects back there
 * (not just to a hardcoded `/orders`).
 */
test.describe("login", () => {
	test("visiting a protected route redirects to /login with ?from=, and signing in returns there", async ({
		page,
	}) => {
		await page.goto("/orders");
		await expect(page).toHaveURL(/\/login\?from=%2Forders/);

		await page.getByRole("button", { name: "Sign in as demo user" }).click();

		await expect(page).toHaveURL("/orders");
		await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
	});

	test("visiting /login directly (no ?from=) defaults to /orders after sign-in", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.getByRole("button", { name: "Sign in as demo user" }).click();

		await expect(page).toHaveURL("/orders");
	});
});
