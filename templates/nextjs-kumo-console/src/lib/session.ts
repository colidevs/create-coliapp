import { z } from "zod";

/**
 * Session/tenant shapes shared by the DAL (`src/lib/dal.ts`), the Server
 * Action (`src/lib/actions/select-tenant.ts`), and `src/lib/ability.ts`.
 *
 * Deliberately kept in its own module, free of any Next.js server-only APIs:
 * `dal.ts` imports "server-only" (per frontend-security-auth.md), and that
 * marker package throws unconditionally when its module is evaluated outside
 * Next's react-server module graph — including under plain Node/Vitest
 * execution, which has no react-server condition to swap it for its
 * empty-module build. Anything that must be importable from a unit test
 * (or from ability.ts, which also runs server-side but has no secret to
 * guard) lives here instead.
 */

export const membershipSchema = z.object({
	tenantId: z.string(),
	tenantName: z.string(),
	role: z.enum(["owner", "admin", "member"]),
});

export const sessionSchema = z.object({
	userId: z.string(),
	email: z.string(),
	memberships: z.array(membershipSchema).min(1),
});

export type Membership = z.infer<typeof membershipSchema>;
export type Session = z.infer<typeof sessionSchema>;

/** Written only by the `selectTenant` Server Action, after membership validation (design decision D3). */
export const ACTIVE_TENANT_COOKIE = "active_tenant";

/**
 * Read-only signal for `proxy.ts`'s optimistic check and `dal.ts`'s real
 * check. Nothing in this template writes it yet — see this phase's report
 * for the flagged login-route gap.
 */
export const SESSION_COOKIE = "session_id";

/**
 * The header `src/lib/api/server-client.ts`'s `apiRequest` mutator sets from
 * `verifySession()`'s own resolved `activeTenantId` (Phase 3, orders
 * module) — never the raw `ACTIVE_TENANT_COOKIE` value directly, since that
 * cookie is absent until `selectTenant()` first runs. Kept here (not in
 * `server-client.ts`, which imports `"server-only"`) so
 * `src/mocks/handlers/orders.ts` can read the same constant without pulling
 * in a server-only module — mirrors this file's own "importable from a unit
 * test" rationale above.
 */
export const ACTIVE_TENANT_HEADER = "x-active-tenant";

/**
 * Resolves which tenant is "active" for a session: the cookie's tenant when
 * the session genuinely holds that membership, otherwise the first
 * membership. Pure and side-effect-free by design — this is the reusable
 * unit-test surface for the tenant-scoping logic `verifySession()` applies;
 * `dal.ts` itself only orchestrates I/O (cookies, fetch) around this.
 */
export function resolveActiveTenantId(
	session: Pick<Session, "memberships">,
	activeTenantCookie: string | undefined,
): string {
	const stillMember = session.memberships.some(
		(membership) => membership.tenantId === activeTenantCookie,
	);

	return stillMember
		? (activeTenantCookie as string)
		: session.memberships[0].tenantId;
}
