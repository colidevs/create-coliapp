import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "./support";

/**
 * Spec scenario: a 422 validation-error case rendering as a field-level
 * error, proving `problemToActionState`'s wiring end-to-end through the UI
 * (console-golden-path.md), not just at the unit level.
 *
 * A whitespace-only name (`" "`), not an empty string: `order-form-dialog
 * .client.tsx`'s `<Input name="name" required />` sets the native HTML
 * `required` attribute, which blocks submission client-side for a literal
 * empty value before the request ever reaches the Server Action — the
 * browser's own `required` validation does not trim whitespace, so a single
 * space satisfies it while `src/mocks/handlers/orders.ts`'s `validateName`
 * (which does trim) still rejects it server-side with a 422. This is the
 * genuine way to reach the 422 path through the real UI, not a workaround
 * around `required`.
 */
test("submitting a whitespace-only order name surfaces the field-level 422 error", async ({
	page,
}) => {
	await signInAsDemoUser(page);

	await page.getByRole("button", { name: "New order" }).click();

	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Name").fill(" ");
	await dialog.getByRole("button", { name: "Create" }).click();

	await expect(dialog.getByText("Name must not be empty.")).toBeVisible();
	// The dialog stays open on a validation failure — proves this is the
	// `useActionState` error branch, not a swallowed/ignored submission.
	await expect(dialog).toBeVisible();
});
