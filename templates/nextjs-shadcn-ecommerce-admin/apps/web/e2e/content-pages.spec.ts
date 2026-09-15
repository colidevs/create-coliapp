import { expect, test } from "@playwright/test";

/**
 * Standard content-page scaffold (`sdd/ecommerce-product-variants/
 * apply-progress` PR16). Navigates through the ACTUAL rendered footer links
 * (`components/footer.tsx`) rather than typing each URL directly — proves
 * the pages are genuinely reachable from the storefront shell, not orphan
 * routes, and that the shared header/nav/cart chrome (`(ecommerce)/shell.tsx`)
 * renders around each one.
 */
test("reaches Terms, Privacy, FAQ, and About from the footer, each keeping the storefront header/nav intact", async ({
	page,
}) => {
	await page.goto("/");

	// Header stays present on every one of these routes — same `EcommerceShell`
	// wraps every page under the `(ecommerce)` route group.
	const header = page.getByRole("banner");
	await expect(header).toBeVisible();

	await page.getByRole("link", { name: "About Us" }).click();
	await expect(page).toHaveURL("/about");
	await expect(
		page.getByRole("heading", { name: "About Us", level: 1 }),
	).toBeVisible();
	await expect(header).toBeVisible();

	await page.getByRole("link", { name: "FAQ" }).click();
	await expect(page).toHaveURL("/faq");
	await expect(
		page.getByRole("heading", { name: "Frequently Asked Questions", level: 1 }),
	).toBeVisible();
	await expect(page.getByText(/\[Placeholder\]/).first()).toBeVisible();
	await expect(header).toBeVisible();

	await page.getByRole("link", { name: "Terms & Conditions" }).click();
	await expect(page).toHaveURL("/terms");
	await expect(
		page.getByRole("heading", { name: "Terms & Conditions", level: 1 }),
	).toBeVisible();
	await expect(
		page.getByText("Placeholder content — replace before launch"),
	).toBeVisible();
	await expect(header).toBeVisible();

	await page.getByRole("link", { name: "Privacy Policy" }).click();
	await expect(page).toHaveURL("/privacy");
	await expect(
		page.getByRole("heading", { name: "Privacy Policy", level: 1 }),
	).toBeVisible();
	await expect(
		page.getByText("Placeholder content — replace before launch"),
	).toBeVisible();
	await expect(header).toBeVisible();
});
