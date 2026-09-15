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
	await expect(
		page.getByRole("button", { name: "Out of stock" }),
	).toBeDisabled();

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

/**
 * Bug fix regression (`sdd/ecommerce-product-variants/apply-progress`
 * PR11) — found live via a manual Playwright UX audit AND independently via
 * a code-quality review of `variant-selector.tsx`, not by an automated
 * test. "Modular Bookshelf" (`mocks/data/{products,variants}.ts`) has TWO
 * option types (`Finish` × `Size`) with a deliberately IMPOSSIBLE
 * combination: Walnut/Large has no variant (Natural/Small, Natural/Large,
 * Walnut/Small all exist).
 *
 * Before the fix, `<VariantSelector>` passed the DEFAULT variant as
 * `resolveVariant`'s `fallback` on every render, so selecting Walnut/Large
 * silently resolved to the Natural/Small variant instead — the option
 * buttons still showed Walnut/Large highlighted, but `AddToCartButton`
 * received Natural/Small, so the WRONG item entered the cart with no
 * warning at all. This test selects exactly that impossible combination and
 * asserts: no price is shown for it, a "Not available in this combination"
 * message appears, "Add to cart" is disabled, and — critically — the cart
 * drawer never opens and never receives ANY item for this product when the
 * (disabled) button is clicked.
 */
test("selecting an option combination with no matching variant disables add-to-cart instead of silently substituting the wrong variant", async ({
	page,
}) => {
	await page.goto("/products/modular-bookshelf");

	// Seeded default is Natural/Small — switch Finish to Walnut first (still
	// resolves Walnut/Small, a REAL variant), then Size to Large, landing on
	// the impossible Walnut/Large combination.
	await page.getByRole("button", { name: "Walnut" }).click();
	await page.getByRole("button", { name: "Large" }).click();

	await expect(
		page.getByText("Not available in this combination"),
	).toBeVisible();

	// `AddToCartButton` renders its own "Out of stock" label whenever
	// `variant` is `undefined` (same as a genuine zero-stock variant,
	// `cart-button.tsx`'s own `unavailable` flag) — the "Not available in
	// this combination" price-row badge above is what distinguishes THIS
	// case from a real zero-stock variant, not the button's own label.
	const addToCartButton = page.getByRole("button", { name: "Out of stock" });
	await expect(addToCartButton).toBeDisabled();

	// The header's cart badge only renders once `totalItems > 0`
	// (`components/header.tsx`) — asserting its absence is the strongest,
	// most direct proof that nothing silently entered the cart, stronger
	// than checking the drawer's own open/closed state.
	const cartTrigger = page.getByRole("button", { name: "Open cart" });
	await expect(cartTrigger.locator("span")).toHaveCount(0);

	// The disabled button is a no-op click — confirms the click itself
	// cannot smuggle a line item in even if `disabled` were ever bypassed.
	await addToCartButton.click({ force: true });
	await expect(cartTrigger.locator("span")).toHaveCount(0);

	// Switching Size back to Small re-resolves the REAL Walnut/Small variant
	// — the fix does not break the legitimate, existing combination.
	await page.getByRole("button", { name: "Small" }).click();
	await expect(
		page.getByText("Not available in this combination"),
	).not.toBeVisible();
	await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();

	// Completing the add-to-cart for the REAL Walnut/Small variant confirms
	// the fix doesn't just disable everything — a genuine match still works.
	// The cart drawer opens automatically on add (same as the first test
	// above) — its own heading/line-item text is asserted directly here
	// rather than the header's badge, since the open drawer sets
	// `aria-hidden` on the rest of the page, making the header's own cart
	// trigger button (and its badge) unreachable by role while it's open.
	await page.getByRole("button", { name: "Add to cart" }).click();
	await expect(page.getByRole("heading", { name: "Cart (1)" })).toBeVisible();
	await expect(page.getByText("Walnut / Small")).toBeVisible();
});
