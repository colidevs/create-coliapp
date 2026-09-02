-- Better Auth's `organization` plugin tables (`organization`, `member`,
-- `invitation`) plus the `activeOrganizationId` column it adds to the
-- already-existing `session` table (`drizzle/0002_better_auth_core_tables.sql`).
--
-- Closes the real, previously-open `adr0012.tenant-safe-caching` finding
-- (`api-standard/findings.json`): `src/v1/middlewares/cache.ts`'s
-- `resolveTenantId()` used to read the unauthenticated, client-controlled
-- `x-tenant-id` header. It now reads `session.activeOrganizationId`, sourced
-- here — see `src/lib/auth.ts` for the plugin wiring and hefesto's
-- `backend-template-stack.md` (ADR 0014) for the standing "adopt
-- `organization` + `passkey` + `bearer`" decision this closes the
-- `organization` half of.
--
-- Hand-authored as a `drizzle-kit generate --custom` migration, same
-- convention as `0002_better_auth_core_tables.sql` — Better Auth manages
-- these tables through its own built-in Kysely/`pg` adapter, independent of
-- the Drizzle ORM schema in `src/lib/db/schema.ts`, so `drizzle-kit
-- generate`'s normal schema-diffing has nothing to diff against for them.
--
-- Column shapes, defaults, nullability, and index names below are
-- reproduced from `better-auth@1.7.2`'s actual shipped `organization`
-- plugin source (`better-auth/dist/plugins/organization/organization.mjs`'s
-- runtime `schema` object — NOT its `.d.mts` type-level
-- `*DefaultFields` interfaces, which drifted from the runtime shape on at
-- least one field: `organization.updatedAt` is documented at the type level
-- but does not exist as a runtime column) and `better-auth/dist/
-- db/get-migration.mjs`'s actual DDL-generation logic — not transcribed
-- from documentation or memory. Two details a memory-based schema would
-- have gotten wrong:
--
-- 1. For a brand-new table (this migration's case — `toBeCreated`, not
--    `toBeAdded`), the generator ONLY applies a DB-level column default for
--    a `date`-typed field whose `defaultValue` is itself a function
--    (`() => new Date()`) — never for a static default like
--    `member.role`'s `"member"` or `invitation.status`'s `"pending"`. Those
--    two columns are `NOT NULL` with no DB default; Better Auth's own
--    create-endpoint always supplies the value at insert time. Only
--    `invitation.createdAt` (whose `defaultValue` IS a function) gets
--    `DEFAULT CURRENT_TIMESTAMP` — `organization.createdAt` and
--    `member.createdAt` do not, matching `0002`'s own precedent that
--    `session.updatedAt`/`account.updatedAt` stay app-layer-only.
-- 2. `organization.slug` carries both `unique: true` and `index: true` in
--    the plugin source, but the generator's `toBeCreated` path explicitly
--    skips a separate `CREATE INDEX` whenever `unique` is already true
--    (`if (field.index && !field.unique)`) — `unique` becomes an inline
--    `UNIQUE` column constraint instead, the same shape `0002` already used
--    for `user.email`. No separate `organization_slug_uidx` index exists.
--
-- Default ID generation (`advanced.database.generateId` left unset, per
-- `src/lib/auth.ts`) produces an application-generated string ID, hence
-- `"id" text`, not `uuid` — same convention as `0002`.
--
-- Foreign keys default to `ON DELETE CASCADE` (`organization.mjs`'s field
-- definitions set no explicit `references.onDelete`, and the generator
-- falls back to `"cascade"`).
--
-- These three tables are platform-level, same as `0002`'s five (no
-- `tenant_id`, no RLS) — Better Auth's own session check is what scopes
-- access, not a Postgres policy.
--
-- NOT independently re-verified against a live Postgres in this pass (the
-- same caveat `0002` originally carried for its `jwks` table before that
-- smoke test) — re-run `pnpm run db:migrate` against a real
-- `DATABASE_OWNER_URL` and confirm `POST /api/auth/organization/create`
-- (or `authClient.organization.create()`) succeeds and stamps
-- `session.activeOrganizationId` before treating this migration as
-- equally live-verified.

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
