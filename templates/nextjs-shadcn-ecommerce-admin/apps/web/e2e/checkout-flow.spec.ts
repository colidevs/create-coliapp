import { expect, test } from "@playwright/test";

/**
 * Spec scenario (`sdd/ecommerce-admin-template/spec`, "Storefront core
 * purchase flow"): browse → add to cart → checkout (mocked dLocal via MSW,
 * `src/mocks/handlers/storefront.ts`) → the checkout-return page reflects
 * the order's status. The mocked `POST /api/v1/dlocal/checkout` handler
 * returns a `redirectUrl` pointing back at this app's own `/checkout/return`
 * route, so the full round-trip stays on `localhost` — no real dLocal
 * sandbox is involved.
 */
test("browses, adds to cart, checks out, and lands on the return page", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Browse all products" }).click();
	await expect(page).toHaveURL(/\/products/);

	await page.getByRole("link", { name: /Oak Dining Chair/ }).click();
	await expect(page).toHaveURL(/\/products\/oak-dining-chair/);

	await page.getByRole("button", { name: "Add to cart" }).click();

	// The cart drawer opens automatically on add — checkout from there.
	await page.getByRole("button", { name: "Checkout" }).click();
	await expect(page).toHaveURL("/checkout");

	await page.getByLabel("Full name").fill("Jane Doe");
	await page.getByLabel("Email").fill("jane@example.com");
	await page.getByLabel("Document").fill("12345678");

	await page.getByRole("button", { name: "Pay with dLocal" }).click();

	await expect(page).toHaveURL("/checkout/return");
	await expect(page.getByText(/Status at checkout:/)).toBeVisible();
	await expect(page.getByText("PENDING")).toBeVisible();
});
