import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "./support";

/**
 * Spec scenario: "axe scan passes" — GIVEN the E2E suite runs against the
 * orders route, WHEN `@axe-core/playwright` scans the page, THEN zero
 * serious/critical violations are reported
 * (frontend-accessibility-baseline.md's whole-page/routed-context altitude,
 * additive to `@storybook/addon-a11y`'s single-component altitude).
 *
 * Filters to `serious`/`critical` impact only, per the spec's own wording —
 * `moderate`/`minor` findings are reported (for visibility) but never fail
 * this check, consistent with axe-core's own impact taxonomy.
 */
test("orders route has no serious or critical accessibility violations", async ({
	page,
}) => {
	await signInAsDemoUser(page);

	const results = await new AxeBuilder({ page }).analyze();
	const seriousOrCritical = results.violations.filter(
		(violation) =>
			violation.impact === "serious" || violation.impact === "critical",
	);

	expect(
		seriousOrCritical,
		`Serious/critical a11y violations:\n${JSON.stringify(seriousOrCritical, null, 2)}`,
	).toEqual([]);
});
