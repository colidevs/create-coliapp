import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared demo sign-in helper (`e2e/login.spec.ts`'s own flow, factored out
 * for reuse by every other spec that needs an authenticated session first).
 * Mirrors `src/app/login/page.tsx` / `src/app/login/actions.ts`'s demo
 * sign-in — see those files' own doc comments for why this has no real
 * credential to submit.
 */
export async function signInAsDemoUser(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByRole("button", { name: "Sign in as demo user" }).click();
	await expect(page).toHaveURL("/orders");
}
