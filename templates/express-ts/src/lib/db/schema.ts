import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * @description Example tenant-scoped table for this template. Every
 * multitenant table in a real project MUST carry a `tenant_id` column and
 * a matching RLS policy (see `drizzle/0001_rls_roles.sql`) — this table
 * exists to prove the `withTenantSession` pattern end-to-end, not as a
 * real business resource. Rename/replace once real domain tables land.
 */
export const orders = pgTable("orders", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	tenantId: uuid("tenant_id").notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});
