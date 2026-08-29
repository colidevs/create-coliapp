import { betterAuth } from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { Pool } from "pg";
import { config } from "@/config";
import { EnvironmentError } from "@/v1/res/errors";

/**
 * @description Better Auth wiring — `bearer` + `emailAndPassword` +, as of
 * hefesto's `docs/backlog/e2e-buildable-toolset-plan.md` Arc A3, `jwt`.
 * `organization`/`passkey` plugins remain out of scope — see
 * `colidevs/munod#44` (the validated production reference this template's
 * shape is drawn from).
 *
 * **PostgREST/JWT bridge (Arc A3, proposed — pending Thomas's review, not
 * yet an accepted ADR 0014 amendment)**: `bearer()` alone issues opaque
 * session tokens, which PostgREST cannot verify (it needs a JWT it can check
 * a signature on and read a `role` claim from — ADR 0014's "FRESH
 * `PostgrestClient` per request, forwarding that request's own
 * `Authorization` header" assumed a JWT was already available, which held
 * under Supabase Auth but not under Better Auth's `bearer` plugin alone).
 * `jwt()` mints a short-lived, per-request JWT from the already-verified
 * session — `src/v1/middlewares/auth.ts` calls `getAuth().api.getToken()`
 * right after `getSession()` succeeds, and `src/lib/postgrest/client.ts`
 * signs the PostgREST-bound `Authorization` header with THAT JWT, never the
 * opaque bearer token itself.
 *
 * Deliberately uses the plugin's default asymmetric signing (EdDSA/Ed25519
 * via its own locally-managed JWKS, exposed at `GET /api/auth/jwks`) rather
 * than a shared HMAC secret — `better-auth@1.7.2`'s `jwt()` plugin has no
 * built-in symmetric-secret signing mode (verified against
 * `node_modules/better-auth/dist/plugins/jwt/types.d.mts`: `JWKOptions` only
 * lists `EdDSA`/`ES256`/`ES512`/`PS256`/`RS256`). This is also PostgREST's
 * own documented path for asymmetric verification: `PGRST_JWT_SECRET` may
 * hold a literal JWK/JWKS JSON value, not only a symmetric secret string
 * (https://docs.postgrest.org/en/v13/references/auth.html). PostgREST reads
 * that value once at boot/config-reload — it does NOT poll a remote JWKS
 * URL — so the deploy step is: fetch `GET {BETTER_AUTH_URL}/api/auth/jwks`
 * once and paste that JSON into PostgREST's own `PGRST_JWT_SECRET` (a
 * separate service's config, never read by this app — see `.env.example`).
 * Key rotation (`jwks.rotationInterval`) is deliberately left disabled
 * (the plugin's own default) so that pasted value stays valid without
 * requiring PostgREST to be reconfigured on a schedule; enabling rotation
 * later would require re-deriving that deploy step, out of scope here.
 *
 * The `role` claim (`definePayload` below) is what PostgREST actually reads
 * to pick which Postgres role to switch into for the request — without it,
 * every PostgREST request from this app would fall back to the anon role.
 * Defaults to `"authenticated"` (Supabase's own convention for a signed-in
 * user), overridable via `POSTGREST_JWT_ROLE` for a project whose
 * Supabase-hosted Postgres uses a different role name.
 *
 * Reuses `DATABASE_RUNTIME_URL` — the same Postgres connection string
 * `src/lib/db/client.ts`'s Drizzle pool already uses — instead of a second,
 * parallel `BETTER_AUTH_DATABASE_URL`. Better Auth manages its own
 * `user`/`session`/`account`/`verification` tables through its built-in
 * Kysely/`pg` adapter, via a separate `pg.Pool` instance (never the Drizzle
 * instance itself — `src/lib/db/client.ts`'s raw Drizzle handle is
 * intentionally not exported outside `src/lib/db/session.ts`, see that
 * module's own doc comment for why).
 *
 * `Auth`/`AuthSession` are exported types so `src/v1/middlewares/auth.ts` and
 * `src/v1/types.ts` don't need to re-derive them from `betterAuth`'s return
 * type independently. `Auth` is deliberately `ReturnType<typeof createAuth>`,
 * not `ReturnType<typeof betterAuth>` — the latter resolves against
 * `betterAuth`'s generic default (`BetterAuthOptions`), which is NOT
 * assignable from the concrete, narrower options object `createAuth` below
 * actually passes (`tsc --noEmit` catches this: "Property 'database' is
 * optional in type 'BetterAuthOptions' but required in type
 * '{ database: Pool; ... }'").
 */
function createAuth() {
	const { secret, url } = config.betterAuth;
	const databaseUrl = config.db.runtimeUrl;

	if (!secret || !url) {
		throw new EnvironmentError("BETTER_AUTH_SECRET or BETTER_AUTH_URL");
	}

	if (!databaseUrl) {
		throw new EnvironmentError(
			"DATABASE_RUNTIME_URL",
			"postgres://app_runtime:***@host:5432/db",
		);
	}

	return betterAuth({
		database: new Pool({ connectionString: databaseUrl }),
		baseURL: url,
		secret,
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			bearer(),
			jwt({
				jwt: {
					definePayload: () => ({
						role: config.postgrest.jwtRole,
					}),
				},
			}),
		],
		trustedOrigins: config.cors.allowedOrigins,
	});
}

export type Auth = ReturnType<typeof createAuth>;

export type AuthSession = NonNullable<
	Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

let authInstance: Auth | null = null;

/**
 * @description Lazily constructed on first real use — the `/api/auth/*`
 * handler or the session-checking middleware actually receiving a request —
 * mirroring `src/lib/db/client.ts`'s `getPool()`/`getDb()` pattern.
 * Deliberately NOT an eagerly-created module-scope `export const auth = ...`
 * like munod's own `src/lib/auth.ts`: this template's test suite imports
 * `@/api` (and therefore this module, once mounted) across nearly every test
 * file, with no `BETTER_AUTH_*`/`DATABASE_RUNTIME_URL` env vars set — an
 * eager `EnvironmentError` throw at import time would break the whole suite,
 * not just auth-specific tests.
 */
export function getAuth(): Auth {
	if (!authInstance) {
		authInstance = createAuth();
	}

	return authInstance;
}
