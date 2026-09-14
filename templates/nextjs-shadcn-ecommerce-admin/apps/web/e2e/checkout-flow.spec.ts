import { expect, test } from "@playwright/test";

/**
 * Spec scenario (`sdd/ecommerce-admin-template/spec`, "Storefront core
 * purchase flow"), extended by `sdd/ecommerce-product-variants/spec`'s
 * "Variant matching via every/some predicate" (Phase 7): browse → resolve a
 * variant via `<VariantSelector>` → add to cart → checkout (mocked dLocal
 * via MSW, `src/mocks/handlers/storefront.ts`) → the checkout-return page
 * reflects the order's status. The mocked `POST /api/v1/dlocal/checkout`
 * handler returns a `redirectUrl` pointing back at this app's own
 * `/checkout/return` route, so the full round-trip stays on `localhost` —
 * no real dLocal sandbox is involved.
 *
 * "Oak Dining Chair" (`storefront.ts`'s `toPublicVariants`) has two `Finish`
 * variants: "Natural" (`isDefault: true`, in stock) and "Walnut" (out of
 * stock) — the test switches to Walnut first to confirm the selector
 * actually resolves a different variant (disabled "Out of stock" button,
 * updated price) before switching back to Natural to complete checkout.
 */
test("browses, resolves a variant, adds to cart, checks out, and lands on the return page", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Browse all products" }).click();
	await expect(page).toHaveURL(/\/products/);

	await page.getByRole("link", { name: /Oak Dining Chair/ }).click();
	await expect(page).toHaveURL(/\/products\/oak-dining-chair/);

	// Switching to the out-of-stock "Walnut" finish resolves a DIFFERENT
	// variant — the add-to-cart control reflects that variant's own
	// availability, not the product's.
	await page.getByRole("button", { name: "Walnut" }).click();
	await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();

	// Switching back to "Natural" (the in-stock, default variant) re-enables
	// the real "Add to cart" control.
	await page.getByRole("button", { name: "Natural" }).click();
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
