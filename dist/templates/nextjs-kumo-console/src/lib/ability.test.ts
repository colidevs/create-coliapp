import { describe, expect, it } from "vitest";

import { defineAbilityFor } from "@/lib/ability";
import type { Session } from "@/lib/session";

const session: Pick<Session, "memberships"> = {
	memberships: [
		{ tenantId: "tenant_acme", tenantName: "Acme Storefront", role: "admin" },
		{ tenantId: "tenant_beta", tenantName: "Beta Storefront", role: "member" },
	],
};

describe("defineAbilityFor", () => {
	it("grants full CRUD on Order for an admin membership", () => {
		const ability = defineAbilityFor(session, "tenant_acme");

		expect(ability.can("read", "Order")).toBe(true);
		expect(ability.can("create", "Order")).toBe(true);
		expect(ability.can("update", "Order")).toBe(true);
		expect(ability.can("delete", "Order")).toBe(true);
	});

	it("grants read/create but not update/delete for a member membership", () => {
		const ability = defineAbilityFor(session, "tenant_beta");

		expect(ability.can("read", "Order")).toBe(true);
		expect(ability.can("create", "Order")).toBe(true);
		expect(ability.can("update", "Order")).toBe(false);
		expect(ability.can("delete", "Order")).toBe(false);
	});

	it("grants nothing for a tenant the session has no membership in", () => {
		const ability = defineAbilityFor(session, "tenant_unknown");

		expect(ability.can("read", "Order")).toBe(false);
		expect(ability.can("create", "Order")).toBe(false);
	});
});
