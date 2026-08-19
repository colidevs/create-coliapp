import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/session";
import { resolveActiveTenantId } from "@/lib/session";

const session: Pick<Session, "memberships"> = {
	memberships: [
		{ tenantId: "tenant_acme", tenantName: "Acme Storefront", role: "admin" },
		{ tenantId: "tenant_beta", tenantName: "Beta Storefront", role: "member" },
	],
};

describe("resolveActiveTenantId", () => {
	it("returns the cookie's tenant when it is a real membership", () => {
		expect(resolveActiveTenantId(session, "tenant_beta")).toBe("tenant_beta");
	});

	it("falls back to the first membership when the cookie names a tenant the session isn't a member of", () => {
		expect(resolveActiveTenantId(session, "tenant_unknown")).toBe(
			"tenant_acme",
		);
	});

	it("falls back to the first membership when no cookie is present", () => {
		expect(resolveActiveTenantId(session, undefined)).toBe("tenant_acme");
	});
});
