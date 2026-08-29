const {
	API_URL,
	SECRETS_ENDPOINT,
	SECRET_KEY,
	DATABASE_URL,
	DATABASE_RUNTIME_URL,
	DATABASE_OWNER_URL,
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	REDIS_URL,
	SUPABASE_URL,
	SUPABASE_KEY,
	POSTGREST_URL,
	POSTGREST_JWT_ROLE,
	MP_PUBLIC_KEY,
	MP_ACCESS_TOKEN,
	CORS_ALLOWED_ORIGINS,
} = process.env;

export const config = {
	port: 3001,
	api_url: API_URL,
	secret: SECRET_KEY,
	secrets_endpoint: SECRETS_ENDPOINT,
	db: {
		/** @deprecated kept only for backward-compat env reads; new code uses `runtimeUrl`/`ownerUrl` below. */
		url: DATABASE_URL,
		/**
		 * Plain-Postgres path (Drizzle, `src/lib/db/`). MUST point at the
		 * `app_runtime` role (`NOBYPASSRLS`), never the migration/owner role —
		 * see `drizzle/0001_rls_roles.sql`.
		 */
		runtimeUrl: DATABASE_RUNTIME_URL,
		/** Migration/owner role connection string. Used only by `drizzle-kit`, never at request time. */
		ownerUrl: DATABASE_OWNER_URL,
	},
	supabase: {
		url: SUPABASE_URL,
		key: SUPABASE_KEY,
	},
	/**
	 * Supabase-hosted path (PostgREST, `src/lib/postgrest/`).
	 *
	 * `jwtRole` (Arc A3, proposed — see `src/lib/auth.ts`) is the Postgres
	 * role name embedded in the `role` claim of every PostgREST-bound JWT
	 * this app mints — PostgREST switches into this role for the duration of
	 * the request. Defaults to `"authenticated"` (Supabase's own convention),
	 * overridable via `POSTGREST_JWT_ROLE`.
	 *
	 * Deliberately does NOT expose `PGRST_JWT_SECRET` here: that variable
	 * configures the separate PostgREST *service's* own JWT verification and
	 * is never read by this Express app — see `.env.example`.
	 */
	postgrest: {
		url: POSTGREST_URL,
		jwtRole: POSTGREST_JWT_ROLE || "authenticated",
	},
	/**
	 * Better Auth (`src/lib/auth.ts`) — `bearer` + `emailAndPassword` +
	 * `jwt`. Deliberately no separate database-connection env var here:
	 * Better Auth reuses `db.runtimeUrl` above, the same connection string
	 * `src/lib/db/client.ts`'s Drizzle pool already uses.
	 */
	betterAuth: {
		secret: BETTER_AUTH_SECRET,
		url: BETTER_AUTH_URL,
	},
	redis: {
		url: REDIS_URL,
	},
	mercado_pago: {
		public_key: MP_PUBLIC_KEY,
		access_token: MP_ACCESS_TOKEN,
	},
	cors: {
		allowedOrigins: (CORS_ALLOWED_ORIGINS ?? "")
			.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean),
	},
};
