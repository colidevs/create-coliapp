"use server";

import { cookies } from "next/headers";

import { verifySession } from "@/lib/dal";
import { ACTIVE_TENANT_COOKIE } from "@/lib/session";

export interface SelectTenantResult {
	ok: boolean;
	error?: string;
}

/**
 * The only writer of the httpOnly `active_tenant` cookie (design decision D3,
 * `kumo-console-template`). Never trusts a client-supplied tenant ID
 * directly — a client-set `X-Tenant-Id`-style header was explicitly
 * rejected per ADR 0012 (tenant ID resolved server-side after auth, never
 * from a client header). This validates the requested tenant against the
 * session's own memberships (`verifySession()`, the same DAL boundary every
 * protected route uses) before writing anything, and rejects — no cookie
 * write — if the tenant isn't one of them.
 *
 * This is the DAL/service-layer enforcement the spec's "DAL enforces beyond
 * the UI hint" scenario requires: `<Can>` (`src/components/can.tsx`) only
 * hides/disables a tenant option in the UI, it never substitutes for this
 * check, and calling this action directly with an out-of-membership tenant
 * ID is rejected here regardless of what the UI would have allowed.
 */
export async function selectTenant(
	tenantId: string,
): Promise<SelectTenantResult> {
	const session = await verifySession();

	const membership = session.memberships.find((m) => m.tenantId === tenantId);

	if (!membership) {
		return { ok: false, error: "Not a member of the requested tenant." };
	}

	// TODO(backend): re-mint a per-tenant API credential/token here once a real
	// auth backend exists. templates/express-ts currently ships only HTTP
	// Basic Auth — no Better Auth, no session/token issuance, no per-tenant
	// re-scoping endpoint of any kind (see the kumo-console-template design
	// doc's "V2" finding). Until that lands, switching `active_tenant` changes
	// only which tenant's data this app *requests* — it carries no distinct,
	// re-scoped credential per tenant. Tenant isolation stays enforced
	// entirely by the MSW-mocked (and, later, real) service layer's own
	// `(user_id, tenant_id, role)` check (api-rbac-signing-auth.md), never by
	// a token difference on this side. Never fake a token mint here — this
	// comment is the honest gap marker, not a placeholder to quietly fill in.

	const cookieStore = await cookies();
	cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
	});

	return { ok: true };
}
