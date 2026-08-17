import { defineConfig } from "drizzle-kit";

/**
 * @description `drizzle-kit generate`/`migrate` MUST connect using the
 * migration/owner role (`DATABASE_OWNER_URL`), never the runtime role — the
 * owner role is the one allowed to run DDL (`CREATE TABLE`, `CREATE POLICY`,
 * `ALTER TABLE ... FORCE ROW LEVEL SECURITY`). See
 * `drizzle/0001_rls_roles.sql` and `src/lib/db/client.ts`.
 */
export default defineConfig({
	dialect: "postgresql",
	schema: "./src/lib/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_OWNER_URL ?? "",
	},
});
