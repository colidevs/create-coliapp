import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "./support";

/**
 * Spec scenario: "Tenant switch scopes data" — the first phase that can
 * actually exercise this end-to-end (Phase 2 flagged it as blocked on the
 * missing `/login` route; Phase 3's own `orders/page.tsx` doc comment
 * repeats the same flag). Exercises `<TenantSwitcher>`
 * (`src/components/tenant-switcher.client.tsx`) calling the real
 * `selectTenant` Server Action (`src/lib/actions/select-tenant.ts`), and
 * confirms the orders list visibly changes to the newly active tenant's own
 * rows — enforced server-side by `src/mocks/handlers/orders.ts` reading the
 * `x-active-tenant` header, never by client-side filtering.
 */
test("switching the active tenant scopes the visible orders to that tenant only", async ({
	page,
}) => {
	await signInAsDemoUser(page);

	// Default active tenant: tenant_acme (the mocked session's first
	// membership — src/mocks/data/session.ts / resolveActiveTenantId's
	// fallback, src/lib/session.ts).
	await expect(page.getByText("Acme — Widget batch #1")).toBeVisible();
	await expect(page.getByText("Beta — Launch order")).not.toBeVisible();

	await page
		.getByLabel("Active tenant")
		.selectOption({ label: "Beta Storefront" });

	await expect(page.getByText("Beta — Launch order")).toBeVisible();
	await expect(page.getByText("Acme — Widget batch #1")).not.toBeVisible();
});
