import { expect, test } from "@playwright/test";

import { MOCK_BEARER_TOKEN, MOCK_SESSION } from "../src/mocks/data/auth";

/**
 * Spec scenario (task 7.7, `sdd/ecommerce-admin-template/tasks`): admin
 * login → CRUD per entity (products, stock, an orders status view).
 *
 * **Two separate interception layers are both required for the same
 * `/api/auth/*` path — this is not redundant, see below.**
 *
 * 1. `page.route()` (this file) intercepts BROWSER-context requests:
 *    `authClient.signIn.email()` (`components/login-form.tsx`) and
 *    `authClient.useSession()` (`AuthGuard`/`app-sidebar.tsx`) both run in
 *    the actual browser page and fetch `NEXT_PUBLIC_API_BASE_URL + "/api/
 *    auth/..."` directly. In this project's `playwright.config.ts`,
 *    `NEXT_PUBLIC_API_BASE_URL` is set to `http://localhost:3000` — the
 *    SAME origin as this very Next.js dev server — so without this
 *    interception the browser would really hit Next's own router at that
 *    path and get a plain 404 (no `/api/auth/*` Route Handler exists in
 *    `apps/web` — Better Auth is mounted on `apps/api` only).
 * 2. `src/mocks/handlers/admin.ts`'s Node-side MSW `GET /api/auth/
 *    get-session` handler (already running via `API_MOCKING=enabled`)
 *    intercepts the SEPARATE, SERVER-SIDE fetch `getServerSession()`
 *    (`(adm)/admin/layout.tsx`'s own gate) makes from the Next.js Node
 *    process to `API_BASE_URL + "/api/auth/get-session"`. MSW's Node
 *    interception only patches that one process's own network layer — it
 *    cannot see or intercept the real browser's network calls, which is
 *    exactly why layer 1 is still needed on top of it.
 *
 * Both mocks share the same `MOCK_BEARER_TOKEN`/`MOCK_SESSION` fixture
 * (`src/mocks/data/auth.ts`) so the token the browser "signs in" with is the
 * exact token the server-side session check later validates.
 *
 * Product/stock/order ids below are the exact, stable seed ids from
 * `src/mocks/data/{products,variants,orders}.ts` (Oak Dining Chair's own
 * Natural variant, `order-e2e-001`) — navigated to directly rather than via
 * row-click, since this suite tests the admin CRUD flow itself, not
 * `DataTable`'s own row-action affordances (already exercised, structurally,
 * in every other module's own precedent).
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, task 9.4)**: `admin/stock`
 * is now keyed by VARIANT id, not product id (design's own retarget,
 * PR5) — the stock test below navigates to Oak Dining Chair's own Natural
 * variant id instead of the product id it used before this change.
 */
test.beforeEach(async ({ page }) => {
	// Stateful, per-test flag — `GuestGuard` (`/auth/login`) calls
	// `authClient.useSession()` on mount too, and unconditionally returning a
	// valid session there would bounce the test straight back to `/admin`
	// BEFORE the login form is ever submitted. `get-session` must answer
	// "no session" until the mocked `sign-in/email` call has actually run.
	let signedIn = false;

	await page.route("**/api/auth/sign-in/email", async (route) => {
		signedIn = true;
		await route.fulfill({
			status: 200,
			headers: { "set-auth-token": MOCK_BEARER_TOKEN },
			contentType: "application/json",
			body: JSON.stringify({
				redirect: false,
				token: MOCK_BEARER_TOKEN,
				user: MOCK_SESSION.user,
			}),
		});
	});

	await page.route("**/api/auth/get-session", async (route) => {
		if (!signedIn) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "null",
			});
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(MOCK_SESSION),
		});
	});
});

async function login(page: import("@playwright/test").Page) {
	await page.goto("/auth/login");
	await page.getByLabel("Email").fill("admin@example.com");
	await page.getByLabel("Password").fill("correcthorsebatterystaple");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("/admin");
}

test("admin logs in and lands on the admin dashboard", async ({ page }) => {
	await login(page);
	await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
});

/**
 * **Retargeted (`sdd/ecommerce-product-variants`, task 9.2)**: `ProductForm`
 * no longer manages `price`/`stock`/`code`/`altCode` — a product is created
 * as catalog metadata only (draft, `isActive: false`), publishing it
 * requires at least one active variant (design's own publish invariant).
 * This test now only exercises the metadata fields; a variant is created
 * separately in the "creates a variant" test below.
 */
test("admin creates a product, then views and edits it", async ({ page }) => {
	await login(page);

	await page.goto("/admin/products");
	await expect(
		page.getByRole("link", { name: "Oak Dining Chair" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Nuevo registro" }).click();
	await expect(page).toHaveURL("/admin/products/add");

	await page.getByLabel("Name").fill("E2E Test Stool");
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL("/admin/products");
	await expect(
		page.getByRole("link", { name: "E2E Test Stool" }),
	).toBeVisible();

	await page.getByRole("link", { name: "E2E Test Stool" }).click();
	await expect(
		page.getByRole("heading", { name: "E2E Test Stool" }),
	).toBeVisible();
	// Freshly created, zero variants yet — the derived "from price" has
	// nothing to derive from (design D4).
	await expect(page.getByText("No variants yet")).toBeVisible();
});

/**
 * **Retargeted (`sdd/ecommerce-product-variants`, task 9.4)**: `admin/stock`
 * is now keyed by VARIANT id — Oak Dining Chair's own seeded Natural variant
 * (`mocks/data/variants.ts`), not the product id this test navigated to
 * before this change.
 */
test("admin adjusts a variant's stock level", async ({ page }) => {
	await login(page);

	const naturalVariantId = "00000000-0000-4000-8000-000000000011";

	await page.goto(`/admin/stock/${naturalVariantId}/update`);
	await expect(page.getByRole("heading", { name: "Edit stock" })).toBeVisible();

	await page.getByLabel("Stock", { exact: true }).fill("25");
	await page.getByRole("button", { name: "Save changes" }).click();

	await expect(page).toHaveURL("/admin/stock");

	await page.goto(`/admin/stock/${naturalVariantId}`);
	await expect(page.getByText("25")).toBeVisible();
});

/**
 * NEW (`sdd/ecommerce-product-variants`, task 9.4): an admin creates a new
 * variant for an existing product, assigns an option-value selection to it
 * (Velvet Sofa's own — a product with a single, option-less default variant
 * before this test runs), and confirms it appears in that product's own
 * variants list — exercising the sub-resource nesting
 * (`admin/products/[id]/variants`) and the option-value picker
 * (`modules/variants/form.tsx`).
 */
test("admin creates a variant with an option-value selection", async ({
	page,
}) => {
	await login(page);

	const velvetSofaId = "00000000-0000-4000-8000-000000000002";

	await page.goto(`/admin/products/${velvetSofaId}/variants`);
	await expect(page.getByRole("heading", { name: "Variants" })).toBeVisible();
	// The seeded default variant, no options.
	await expect(page.getByRole("cell", { name: "SOF-002" })).toBeVisible();

	await page.getByRole("button", { name: "Nuevo registro" }).click();
	await expect(page).toHaveURL(`/admin/products/${velvetSofaId}/variants/add`);

	await page.getByLabel("Code", { exact: true }).fill("SOF-002-WAL");
	await page.getByLabel("Price").fill("949.00");
	await page.getByLabel("Natural").check();
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL(`/admin/products/${velvetSofaId}/variants`);
	await expect(page.getByRole("cell", { name: "SOF-002-WAL" })).toBeVisible();
});

test("admin views an order's status (read-only)", async ({ page }) => {
	await login(page);

	await page.goto("/admin/orders");
	await expect(
		page.getByRole("link", { name: "order-2026-000123" }),
	).toBeVisible();

	await page.goto("/admin/orders/order-e2e-001");
	await expect(page.getByText("PAID")).toBeVisible();

	// No update control exists on this page at all (`modules/orders/actions.ts`'s
	// header comment: `admin/orders` has no PATCH route) — there is nothing to
	// assert is *disabled*, because nothing is rendered that could mutate it.
});

/**
 * Phase 8 (PR8): admin creates an option type, then adds a value scoped to
 * it, then confirms the value only appears when filtered by that option
 * type — exercising `modules/variant-option-types`/`variant-option-values`'s
 * own scoped-by-`optionTypeId` convention (mirroring `admin/product-images`'s
 * `?productId=` precedent).
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, task 9.3)**: `handlers/
 * admin.ts` now seeds real "Finish"/"Size" option types (and "Natural"/
 * "Walnut" values under "Finish") — PR8's own literal test names ("Finish"/
 * "Walnut") would collide with that seed data (a duplicate-slug 409 on
 * create, and a false-negative on the "invisible when unscoped" assertion,
 * since a pre-existing "Walnut" row would already be in the unscoped list
 * regardless of this test's own writes). Renamed to "Material"/"Mahogany",
 * names that don't collide with anything in `mocks/data/variant-option-types.ts`.
 */
test("admin creates an option type, then adds a scoped value to it", async ({
	page,
}) => {
	await login(page);

	await page.goto("/admin/variant-option-types");
	await page.getByRole("button", { name: "Nuevo registro" }).click();
	await expect(page).toHaveURL("/admin/variant-option-types/add");

	await page.getByLabel("Name").fill("Material");
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL("/admin/variant-option-types");
	await expect(page.getByRole("link", { name: "Material" })).toBeVisible();

	await page.getByRole("link", { name: "Material" }).click();
	await expect(page.getByRole("heading", { name: "Material" })).toBeVisible();
	const optionTypeUrl = page.url();
	const optionTypeId = optionTypeUrl.split("/").pop();
	if (!optionTypeId) throw new Error("Could not resolve option type id");

	// Deep-linked directly with the `optionTypeId` query param, NOT via the
	// "Nuevo registro" button from the filtered list — `DataTable`'s own
	// `add()` (`components/data-table.tsx`) navigates to `${pathname}/add`
	// with no search params carried over, a pre-existing gap shared with
	// `admin/product-images`'s identical `?productId=` scoping (found here,
	// not introduced by this PR; not fixed, since it's a `DataTable`-level
	// concern affecting every scoped-list module, out of this PR's scope).
	await page.goto(
		`/admin/variant-option-values/add?optionTypeId=${optionTypeId}`,
	);

	await page.getByLabel("Value").fill("Mahogany");
	await page.getByRole("button", { name: "Create" }).click();

	await expect(page).toHaveURL(
		`/admin/variant-option-values?optionTypeId=${optionTypeId}`,
	);
	await expect(page.getByRole("cell", { name: "Mahogany" })).toBeVisible();

	// Scoped-list guarantee: the value is invisible when the list is loaded
	// without (or with a different) `optionTypeId` filter.
	await page.goto("/admin/variant-option-values");
	await expect(page.getByRole("cell", { name: "Mahogany" })).not.toBeVisible();
});

/**
 * NOT E2E-tested here, and explicitly not a gap this suite silently skips
 * over: a CASL-forbidden write rejected server-side even with the UI
 * bypassed. This admin surface's role resolution
 * (`apps/api/src/lib/ability.ts`'s `resolveRole`, `apps/web/src/lib/
 * ability.ts`'s mirrored frontend seam) is fixed to `"admin"` — there is no
 * per-user role column yet, and therefore no way to authenticate as a
 * `"viewer"` session in this environment to observe a real 403. This
 * negative case is already covered, and covered more precisely than an E2E
 * test could, by `apps/api`'s own unit tests: every `admin/{categories,
 * products,product-images,stock}/__tests__/service.test.ts` (PR3b) asserts
 * a `defineAbilityFor("viewer")` write is rejected with `ForbiddenHttpError`
 * and the repository is never called; `admin/orders/__tests__/service.test.ts`
 * (PR4) asserts the same for `"Order"`'s admin-only read grant. Re-verify
 * this note if a future change adds real per-user roles and makes a
 * `"viewer"` login reachable from this app.
 */
