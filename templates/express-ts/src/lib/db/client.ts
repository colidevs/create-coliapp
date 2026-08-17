import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "@/config";
import { EnvironmentError } from "@/v1/res/errors";
import * as schema from "./schema";

/**
 * @description Internal module. Not exported from `./index` — the raw
 * Drizzle instance MUST NOT reach application code directly, or RLS enforcement
 * degrades to developer discipline instead of a module boundary (see ADR 0014 /
 * design D4). Application code goes through `withTenantSession`/
 * `withPlatformSession` in `./session.ts` only.
 *
 * The pool MUST connect using the runtime role (`NOBYPASSRLS`, created by
 * `drizzle/0001_rls_roles.sql`), never the migration/owner role — the owner
 * role bypasses RLS regardless of `FORCE ROW LEVEL SECURITY` (Postgres table
 * owners and superusers are exempt unless the client connects as a
 * different, non-owning role).
 */
let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

function getPool(): Pool {
	if (pool) {
		return pool;
	}

	const url = config.db.runtimeUrl;

	if (!url) {
		throw new EnvironmentError(
			"DATABASE_RUNTIME_URL",
			"postgres://app_runtime:***@host:5432/db",
		);
	}

	pool = new Pool({ connectionString: url });

	return pool;
}

/** @internal used only by `./session.ts` — do not import elsewhere. */
export function getDb(): NodePgDatabase<typeof schema> {
	if (!db) {
		db = drizzle(getPool(), { schema });
	}

	return db;
}

export { schema };
