import type { Session } from "@/lib/session";

/**
 * Canned, fixed session/membership data for Phase 2's MSW handler
 * (`src/mocks/handlers.ts`) — a single authenticated user with real
 * memberships in two tenants, so the tenant-switch scenario (spec: "Tenant
 * switch scopes data") is genuinely demonstrable once a login flow exists
 * (flagged in this phase's report — building one is Phase 4's job, not
 * this phase's). Deliberately static — never grown into a database; full
 * `orders` MSW infrastructure is Phase 3's job, not this file's.
 */
export const mockedSession: Session = {
	userId: "usr_demo",
	email: "demo.user@colidevs.com",
	memberships: [
		{ tenantId: "tenant_acme", tenantName: "Acme Storefront", role: "admin" },
		{ tenantId: "tenant_beta", tenantName: "Beta Storefront", role: "member" },
	],
};
