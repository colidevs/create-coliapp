import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { Pool } from "pg";
import { config } from "@/config";
import { EnvironmentError } from "@/v1/res/errors";

/**
 * @description Better Auth wiring — `bearer` + `emailAndPassword` only.
 * `organization`/`passkey` plugins and the PostgREST/JWT bridge
 * (`src/lib/postgrest/`) are deliberately out of scope here — see hefesto's
 * `docs/backlog/e2e-buildable-toolset-plan.md` Arc A1/A2 and
 * `colidevs/munod#44` (the validated production reference this template's
 * shape is drawn from).
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
		plugins: [bearer()],
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
