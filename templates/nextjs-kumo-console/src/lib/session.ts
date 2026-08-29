import { z } from "zod";

/**
 * Session/tenant shapes shared by the DAL (`src/lib/dal.ts`), the Server
 * Action (`src/lib/actions/select-tenant.ts`), `src/lib/ability.ts`, and
 * now the login flow's real/demo split (`src/app/login/actions.ts`,
 * `src/app/login/login-form.client.tsx`).
 *
 * Deliberately kept in its own module, free of any Next.js server-only APIs:
 * `dal.ts` imports "server-only" (per frontend-security-auth.md), and that
 * marker package throws unconditionally when its module is evaluated outside
 * Next's react-server module graph — including under plain Node/Vitest
 * execution, which has no react-server condition to swap it for its
 * empty-module build. Anything that must be importable from a unit test
 * (or from ability.ts, which also runs server-side but has no secret to
 * guard, or from a Client Component like the real login form) lives here
 * instead.
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
 * check. Two writers now exist, both consistent with this same name:
 *
 * - The MSW/demo path (`src/app/login/actions.ts`'s `signInDemoAction`)
 *   still writes a fixed placeholder value under this name directly.
 * - The real path (`src/lib/auth-client.ts`'s `createAuthClient`, backed by
 *   `templates/express-ts`'s Arc A1/A2 Better Auth wiring) has the browser
 *   set this cookie automatically on a successful `signIn.email()` — Better
 *   Auth's own default cookie name is `<cookiePrefix>.session_token`
 *   (`better-auth.session_token` with no custom `cookiePrefix`, which this
 *   template's `express-ts` backend doesn't set), so this constant's value
 *   is fixed to match Better Auth's real default, not an arbitrary
 *   placeholder like the previous `"session_id"` value.
 *
 * **Disclosed limitation**: Better Auth prefixes this cookie with
 * `__Secure-` when `useSecureCookies` is on (typically HTTPS/production).
 * `express-ts`'s `src/lib/auth.ts` doesn't configure that today, and this
 * template's same-root-domain assumption (Arc A4) is scoped to local
 * dev/HTTP — this constant does not attempt to match both forms. Revisit
 * once a real HTTPS deployment target exists for this template.
 */
export const SESSION_COOKIE = "better-auth.session_token";

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

/**
 * Base URL both the DAL (`src/lib/dal.ts`) and the orders module's mutator
 * (`src/lib/api/server-client.ts`) fetch against — centralized here (design
 * decision, Arc A4) so it has exactly one definition instead of two
 * independently-drifting local copies. Points at the MSW-mocked backend by
 * default (design decision D2); switch to a running `templates/express-ts`
 * instance's own base URL, and flip `API_MOCKING` off, once one exists — see
 * `.env.example`.
 *
 * Server-only in spirit (reads a private, non-`NEXT_PUBLIC_*` env var) but
 * this module itself carries no `"server-only"` import (see this file's own
 * top doc comment on why) — nothing here is a secret, unlike
 * `THUMBOR_SECURITY_KEY`.
 */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

/**
 * The real backend's `/api/v1/me` response shape (`templates/express-ts`'s
 * `GET /api/v1/me`, gated by its Better Auth session-checking middleware,
 * Arc A2). Deliberately minimal — Better Auth's own session/user objects
 * carry no tenant/membership concept, and `getMe`'s controller only ever
 * returns `{ id, email }` (see that file's own source) — never invent extra
 * fields here that the real endpoint doesn't send.
 */
export const meResponseSchema = z.object({
	id: z.string(),
	email: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/**
 * Maps a real, authenticated `/api/v1/me` response onto this template's
 * existing multi-tenant `Session` shape.
 *
 * **Disclosed, deliberate placeholder — not fabricated security data.** The
 * Better Auth session Arc A1/A2 wired is real: the identity check that
 * produces `me` already happened server-side, against a real database, via
 * a real cookie. What's missing is tenant/organization data, which is Arc
 * A3's job (Better Auth's `organization` plugin + the PostgREST/JWT
 * bridge) — explicitly out of scope for Arc A4. Until Arc A3 lands, every
 * real authenticated user is modeled as the sole owner of one implicit
 * personal workspace scoped to their own account, so the console's existing
 * multi-tenant UI (`tenant-switcher.client.tsx`, `ability.ts`) has exactly
 * one real, correctly-scoped option to render instead of crashing on an
 * empty `memberships` array. `tenantName` is a fixed UI label ("Personal
 * workspace"), never an invented organization name — nothing here claims to
 * have fetched real tenant data from the backend. Replace this mapping
 * (and `memberships`'s `min(1)` single-tenant assumption more broadly) once
 * Arc A3 ships real membership rows.
 */
export function sessionFromMeResponse(me: MeResponse): Session {
	return {
		userId: me.id,
		email: me.email,
		memberships: [
			{ tenantId: me.id, tenantName: "Personal workspace", role: "owner" },
		],
	};
}

/**
 * Rejects an absolute URL and a protocol-relative one (`//evil.example`,
 * which browsers resolve as scheme-relative) — only a same-origin relative
 * pathname is ever a valid redirect target. Shared by the MSW/demo Server
 * Action (`src/app/login/actions.ts`) and the real sign-in Client Component
 * (`src/app/login/login-form.client.tsx`) so this open-redirect guard has
 * exactly one implementation, not two independently-maintained copies of
 * the same security-sensitive check.
 */
export function resolveSafeRedirect(
	from: string | undefined | null,
	fallback = "/orders",
): string {
	return typeof from === "string" &&
		from.startsWith("/") &&
		!from.startsWith("//")
		? from
		: fallback;
}
