import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "./support";

/**
 * Spec scenario: full orders CRUD via the Kumo `Dialog.*` leaves built in
 * Phase 3 (`src/components/orders/*.client.tsx`), driven entirely through
 * the UI — create, update, delete — each round-tripping through the real
 * Server Actions (`src/app/(console)/orders/actions.ts`) and MSW's
 * tenant-scoped store (`src/mocks/data/orders.ts`).
 */
test.beforeEach(async ({ page }) => {
	await signInAsDemoUser(page);
});

test("creates, edits, and deletes an order end-to-end", async ({ page }) => {
	await page.getByRole("button", { name: "New order" }).click();

	const createDialog = page.getByRole("dialog");
	await expect(createDialog).toBeVisible();
	await createDialog.getByLabel("Name").fill("E2E created order");
	await createDialog.getByRole("button", { name: "Create" }).click();

	await expect(createDialog).toBeHidden();
	await expect(page.getByText("E2E created order")).toBeVisible();

	const row = page.getByRole("row", { name: /E2E created order/ });
	await row.getByRole("button", { name: "Edit" }).click();

	const editDialog = page.getByRole("dialog");
	await expect(editDialog).toBeVisible();
	await editDialog.getByLabel("Name").fill("E2E updated order");
	await editDialog.getByRole("button", { name: "Save" }).click();

	await expect(editDialog).toBeHidden();
	await expect(page.getByText("E2E updated order")).toBeVisible();
	await expect(page.getByText("E2E created order")).not.toBeVisible();

	const updatedRow = page.getByRole("row", { name: /E2E updated order/ });
	await updatedRow.getByRole("button", { name: "Delete" }).click();

	const confirmDialog = page.getByRole("alertdialog");
	await expect(confirmDialog).toBeVisible();
	await confirmDialog.getByRole("button", { name: "Delete" }).click();

	await expect(confirmDialog).toBeHidden();
	await expect(page.getByText("E2E updated order")).not.toBeVisible();
});
