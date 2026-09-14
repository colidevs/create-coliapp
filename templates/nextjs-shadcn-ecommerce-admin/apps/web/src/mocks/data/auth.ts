/**
 * Shared E2E auth fixture — a single source of truth for the mock bearer
 * token/session pair, imported by BOTH `src/mocks/handlers/admin.ts` (the
 * Node-side MSW handler backing `getServerSession()`'s server-to-server
 * `GET /api/auth/get-session` call) AND `e2e/admin-flow.spec.ts` (Playwright
 * `page.route()` interception of the BROWSER-side `authClient.signIn.email`/
 * `authClient.useSession()` calls — see that spec's own header comment for
 * why two separate interception layers are both needed for the same URL).
 *
 * Shape matches Better Auth's real `getSession` response
 * (`{ session, user }`) closely enough for this template's own consumers
 * (`(adm)/admin/app-sidebar.tsx` reads `session.user.name`/`.email`;
 * `AuthGuard`/`(adm)/admin/layout.tsx` only check truthiness) — not a
 * byte-exact Better Auth schema replica.
 */
export const MOCK_BEARER_TOKEN = "e2e-mock-admin-token";

const now = new Date().toISOString();

export const MOCK_SESSION = {
	session: {
		id: "sess-e2e-admin",
		token: MOCK_BEARER_TOKEN,
		userId: "user-e2e-admin",
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
		createdAt: now,
		updatedAt: now,
	},
	user: {
		id: "user-e2e-admin",
		name: "Admin User",
		email: "admin@example.com",
		emailVerified: true,
		createdAt: now,
		updatedAt: now,
	},
};
