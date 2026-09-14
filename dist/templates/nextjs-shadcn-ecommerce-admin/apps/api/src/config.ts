import { z } from "zod";

/**
 * @description ADR 0041 (`.claude/rules/backend-template-stack.md`,
 * "Environment variable validation at boot") — one schema, `.parse()`'d once
 * at module load, aggregating every missing/invalid var into a single boot
 * error. Replaces this template's previous bare `process.env` destructure
 * (`express-ts/src/config.ts:1-19`) — that gap is a template-level issue, not
 * specific to this port, per `sdd/ecommerce-admin-template/design`'s note.
 *
 * `.safeParse()` is used ONLY to aggregate every failure via
 * `z.prettifyError` before throwing — this is never a silent fallback path;
 * a failed parse always throws and never lets `config` be constructed from
 * partial/invalid data.
 */
const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3001),

	// Plain-Postgres path (Drizzle, `src/lib/db/`). `DATABASE_RUNTIME_URL`
	// MUST point at the `app_runtime` role (`NOBYPASSRLS`), never the
	// migration/owner role — see `drizzle/0001_rls_roles.sql` and
	// `src/lib/db/client.ts`. `DATABASE_OWNER_URL` is used only by
	// `drizzle-kit` (`drizzle.config.ts`), never at request time.
	DATABASE_RUNTIME_URL: z.url(),
	DATABASE_OWNER_URL: z.url(),
	// Deprecated, optional back-compat alias — kept only because
	// `src/v1/modules/health/service.ts` still falls back to it
	// (`config.db.runtimeUrl ?? config.db.url`); new code must never read it.
	DATABASE_URL: z.url().optional(),

	// Better Auth (`src/lib/auth.ts`) — `bearer` + `emailAndPassword` + `jwt`
	// + `organization`. Reuses `DATABASE_RUNTIME_URL` above for its own
	// Kysely/`pg` adapter, no separate database env var.
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),

	// Postgres role name embedded in the `role` claim of every
	// PostgREST-verifiable JWT Better Auth's `jwt` plugin mints
	// (`src/lib/auth.ts`). This template does not wire a PostgREST client
	// itself (Drizzle only, per design decision A1) — kept only because
	// `auth.ts` is copied verbatim from `templates/express-ts` and still
	// reads it.
	POSTGREST_JWT_ROLE: z.string().min(1).default("authenticated"),

	// Service-to-service static-key auth (ADR 0009's carve-out,
	// `src/v1/middlewares/service-auth.ts`).
	SERVICE_KEY: z.string().min(1),

	// Explicit origin allow-list — never `*` (ADR 0009/0010).
	CORS_ALLOWED_ORIGINS: z.string().min(1),

	// Optional cache layer (`src/lib/redis.ts`).
	REDIS_URL: z.url().optional(),

	// AES-256-GCM key for `src/lib/encrypt.ts` (64 hex chars = 32 bytes).
	// Not currently wired to any route in this template, but the module is
	// copied verbatim and its top-level `Buffer.from(config.secret, "hex")`
	// must have a real value available should anything import it.
	SECRET_KEY: z.string().length(64),

	// dLocal Go checkout (`dlocal-checkout` domain, Phase 3). Real evidence
	// against `munod/api` (`src/v1/modules/Dlocal/repository.ts`,
	// `src/config.ts`) shows only `apiKey`/`apiSecret` are actually
	// env-configured there today — `apiUrl` is hardcoded to the sandbox
	// endpoint, and `success_url`/`back_url`/`notification_url`/`currency`/
	// `country` are supplied per-request by the caller, not read from config.
	// This template elevates all of them to configurable env vars (a
	// deliberate template-quality improvement, not a re-statement of
	// munod's current shortcuts) so a scaffolded project can point at
	// dLocal's production API and set its own default redirect/notification
	// URLs and currency/country without a code change. No separate webhook
	// secret exists — `verifyDlocalSignature` (munod's
	// `Dlocal/signature.ts`) reuses `apiKey`/`apiSecret` directly.
	DLOCAL_API_URL: z.url(),
	DLOCAL_API_KEY: z.string().min(1),
	DLOCAL_API_SECRET: z.string().min(1),
	DLOCAL_NOTIFICATION_URL: z.url(),
	DLOCAL_SUCCESS_URL: z.url(),
	DLOCAL_BACK_URL: z.url(),
	DLOCAL_DEFAULT_CURRENCY: z.string().length(3),
	DLOCAL_DEFAULT_COUNTRY: z.string().length(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
}

const env = parsed.data;

export const config = {
	port: env.PORT,
	db: {
		/** @deprecated kept only for backward-compat env reads; new code uses `runtimeUrl`/`ownerUrl` below. */
		url: env.DATABASE_URL,
		runtimeUrl: env.DATABASE_RUNTIME_URL,
		ownerUrl: env.DATABASE_OWNER_URL,
	},
	postgrest: {
		jwtRole: env.POSTGREST_JWT_ROLE,
	},
	betterAuth: {
		secret: env.BETTER_AUTH_SECRET,
		url: env.BETTER_AUTH_URL,
	},
	redis: {
		url: env.REDIS_URL,
	},
	cors: {
		allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean),
	},
	serviceAuth: {
		key: env.SERVICE_KEY,
	},
	secret: env.SECRET_KEY,
	dlocal: {
		apiUrl: env.DLOCAL_API_URL,
		apiKey: env.DLOCAL_API_KEY,
		apiSecret: env.DLOCAL_API_SECRET,
		notificationUrl: env.DLOCAL_NOTIFICATION_URL,
		successUrl: env.DLOCAL_SUCCESS_URL,
		backUrl: env.DLOCAL_BACK_URL,
		defaultCurrency: env.DLOCAL_DEFAULT_CURRENCY,
		defaultCountry: env.DLOCAL_DEFAULT_COUNTRY,
	},
};
