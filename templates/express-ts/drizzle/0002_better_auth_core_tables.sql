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
-- Column shapes, defaults, and index names below are reproduced from
-- Better Auth 1.7.2's actual shipped schema/migration-generation source
-- (`@better-auth/core/src/db/schema/{user,session,account,verification}.ts`,
-- `@better-auth/core/src/db/get-tables.ts`, `@better-auth/core/src/db/
-- database-index.ts`, and `better-auth/dist/db/get-migration.mjs`'s
-- `getType`/`toBeCreated` DDL logic) — not transcribed from documentation or
-- memory. Notably this catches two details a memory-based schema would have
-- gotten wrong: `account.issuer` is a real, current column (added upstream
-- per Better Auth issue #9124, OpenID Connect identity keying), and neither
-- `session.updatedAt` nor `account.updatedAt` gets a DB-level default (only
-- `user`/`verification`'s `updatedAt` do) — Better Auth applies those two
-- columns' timestamps at the application layer instead.
--
-- Default ID generation (`advanced.database.generateId` left unset, per
-- `src/lib/auth.ts`) produces an application-generated string ID, not a
-- Postgres-native `uuid`/`serial` — hence `"id" text`, not `uuid`.
--
-- NOT introspection-verified against a live Postgres in this change (none
-- was available) — the deprecated `@better-auth/cli` package could not be
-- used either (resolves to `1.4.21`, far behind this template's pinned
-- `better-auth@1.7.2`). Run `pnpm run db:migrate` against a real
-- `DATABASE_OWNER_URL` and confirm Better Auth's own runtime queries
-- succeed against it before relying on this in production.

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

-- Two-role model (ADR 0014 / design D4, see `0001_rls_roles.sql`): the
-- owner/migration role creates and owns every table, `app_runtime` needs
-- explicit GRANTs to read/write them at request time. These four tables are
-- platform-level (no tenant_id, no RLS) — Better Auth's own session check is
-- what scopes access, not a Postgres policy.
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification" TO app_runtime;
