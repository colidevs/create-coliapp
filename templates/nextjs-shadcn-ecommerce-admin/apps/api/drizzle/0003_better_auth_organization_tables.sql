-- Better Auth's `organization` plugin tables (`organization`, `member`,
-- `invitation`) plus the `activeOrganizationId` column it adds to the
-- already-existing `session` table (`drizzle/0002_better_auth_core_tables.sql`).
--
-- Reproduced verbatim from
-- `templates/express-ts/drizzle/0003_better_auth_organization_tables.sql` —
-- this template copies that file's `src/lib/auth.ts` (same Better Auth
-- version, same `organization()` plugin wiring) unchanged, so the same DDL
-- applies unchanged. See that file's own header comment for the full
-- sourcing rationale (Better Auth 1.7.2's actual shipped `organization`
-- plugin source, not transcribed from documentation or memory).
--
-- Hand-authored as a `drizzle-kit generate --custom` migration, same
-- convention as `0002_better_auth_core_tables.sql` — Better Auth manages
-- these tables through its own built-in Kysely/`pg` adapter, independent of
-- the Drizzle ORM schema in `src/lib/db/schema.ts`.
--
-- These three tables are platform-level, same as `0002`'s five (no
-- `tenant_id`, no RLS) — Better Auth's own session check is what scopes
-- access, not a Postgres policy. Note this app's own domain tables
-- (`categories`/`products`/`product_images`/`orders`, `0001_rls_roles.sql`)
-- also carry no `tenant_id`, but for a different reason — this template is
-- single-tenant-per-deployment (design deviation from ADR 0014), whereas
-- these Better Auth tables are platform-level by construction regardless of
-- tenancy model.

CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"logo" text,
	"createdAt" timestamptz NOT NULL,
	"metadata" text
);
--> statement-breakpoint

CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"role" text NOT NULL,
	"createdAt" timestamptz NOT NULL
);
--> statement-breakpoint

CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expiresAt" timestamptz NOT NULL,
	"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"inviterId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint

CREATE INDEX "member_organizationId_idx" ON "member" ("organizationId");
--> statement-breakpoint

CREATE INDEX "member_userId_idx" ON "member" ("userId");
--> statement-breakpoint

CREATE INDEX "invitation_organizationId_idx" ON "invitation" ("organizationId");
--> statement-breakpoint

CREATE INDEX "invitation_email_idx" ON "invitation" ("email");
--> statement-breakpoint

-- `organization` plugin's session-table extension — nullable, no DB
-- default, no FK: `session.session.activeOrganizationId` is set entirely at
-- the application layer (`setActiveOrganization`), never by a DB default.
ALTER TABLE "session" ADD COLUMN "activeOrganizationId" text;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "organization", "member", "invitation" TO app_runtime;
