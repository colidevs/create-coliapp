import { describe, expect, it } from "vitest";
import type { Session } from "@/lib/session";
import {
	resolveActiveTenantId,
	resolveSafeRedirect,
	sessionFromMeResponse,
} from "@/lib/session";

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

describe("sessionFromMeResponse", () => {
	it("maps the real backend's /api/v1/me response onto a single-membership Session", () => {
		const result = sessionFromMeResponse({
			id: "usr_real_1",
			email: "real.user@colidevs.com",
		});

		expect(result).toEqual<Session>({
			userId: "usr_real_1",
			email: "real.user@colidevs.com",
			memberships: [
				{
					tenantId: "usr_real_1",
					tenantName: "Personal workspace",
					role: "owner",
				},
			],
		});
	});

	it("never fabricates a tenant name beyond the fixed 'Personal workspace' label", () => {
		const result = sessionFromMeResponse({
			id: "usr_real_2",
			email: "another.user@colidevs.com",
		});

		expect(result.memberships[0]?.tenantName).toBe("Personal workspace");
	});
});

describe("resolveSafeRedirect", () => {
	it("returns a same-origin relative path unchanged", () => {
		expect(resolveSafeRedirect("/orders/123")).toBe("/orders/123");
	});

	it("falls back to /orders (default) for an absolute URL", () => {
		expect(resolveSafeRedirect("https://evil.example/phish")).toBe("/orders");
	});

	it("falls back to /orders (default) for a protocol-relative URL", () => {
		expect(resolveSafeRedirect("//evil.example/phish")).toBe("/orders");
	});

	it("falls back to /orders (default) for undefined/null", () => {
		expect(resolveSafeRedirect(undefined)).toBe("/orders");
		expect(resolveSafeRedirect(null)).toBe("/orders");
	});

	it("honors a custom fallback", () => {
		expect(resolveSafeRedirect(undefined, "/dashboard")).toBe("/dashboard");
	});
});
