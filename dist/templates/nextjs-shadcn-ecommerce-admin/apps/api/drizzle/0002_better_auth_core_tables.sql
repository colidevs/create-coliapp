-- Better Auth's own `user`/`session`/`account`/`verification` tables
-- (`bearer` + `emailAndPassword` plugins only — `organization`/`passkey`
-- plugins are deliberately deferred, see hefesto's
-- docs/backlog/e2e-buildable-toolset-plan.md Arc A1/A2).
--
-- Hand-authored as a `drizzle-kit generate --custom` migration (this
-- template's existing migration convention, `drizzle/0000_init.sql` /
-- `0001_rls_roles.sql`) rather than a separately-invented mechanism —
-- Better Auth manages these tables through its own built-in Kysely/`pg`
-- adapter (`src/lib/auth.ts`), independent of the Drizzle ORM schema in
-- `src/lib/db/schema.ts`, so `drizzle-kit generate`'s normal schema-diffing
-- has nothing to diff against for them.
--
-- Column shapes, defaults, and index names below are reproduced verbatim
-- from `templates/express-ts/drizzle/0002_better_auth_core_tables.sql` —
-- this template copies `templates/express-ts`'s `src/lib/auth.ts` verbatim
-- (same Better Auth version, same plugin set), so the same DDL applies
-- unchanged. See that file's own header comment for the full sourcing
-- rationale (Better Auth 1.7.2's actual shipped schema/migration-generation
-- source, introspection-verified against a live Postgres 17).
--
-- Default ID generation (`advanced.database.generateId` left unset, per
-- `src/lib/auth.ts`) produces an application-generated string ID, not a
-- Postgres-native `uuid`/`serial` — hence `"id" text`, not `uuid`.

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamptz NOT NULL,
	"token" text NOT NULL UNIQUE,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamptz NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamptz,
	"refreshTokenExpiresAt" timestamptz,
	"scope" text,
	"password" text,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamptz NOT NULL
);
--> statement-breakpoint

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamptz NOT NULL,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

CREATE INDEX "session_userId_idx" ON "session" ("userId");
--> statement-breakpoint

CREATE INDEX "account_userId_idx" ON "account" ("userId");
--> statement-breakpoint

CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
--> statement-breakpoint

-- `jwt` plugin's own signing-key store (Arc A3) — see this file's header
-- comment for the schema source and the DB-default caveat on `createdAt`.
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"expiresAt" timestamptz,
	"alg" text,
	"crv" text
);
--> statement-breakpoint

-- Two-role model (ADR 0014 / design D4, see `0001_rls_roles.sql`): the
-- owner/migration role creates and owns every table, `app_runtime` needs
-- explicit GRANTs to read/write them at request time. These five tables are
-- platform-level (no tenant_id, no RLS) — Better Auth's own session check is
-- what scopes access, not a Postgres policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification", "jwks" TO app_runtime;
