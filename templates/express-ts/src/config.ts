const {
	API_URL,
	SECRETS_ENDPOINT,
	SECRET_KEY,
	DATABASE_URL,
	DATABASE_RUNTIME_URL,
	DATABASE_OWNER_URL,
	BASIC_AUTH_USER,
	BASIC_AUTH_PWD,
	REDIS_URL,
	SUPABASE_URL,
	SUPABASE_KEY,
	POSTGREST_URL,
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
	/** Supabase-hosted path (PostgREST, `src/lib/postgrest/`). */
	postgrest: {
		url: POSTGREST_URL,
	},
	basicAuth: {
		user: BASIC_AUTH_USER,
		pwd: BASIC_AUTH_PWD,
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
