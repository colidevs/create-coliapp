import { Pool } from "pg";
import { config } from "@/config";

/**
 * @description `/ready`'s dependency check (ADR 0009: `/health` = process-
 * alive/no checks for Compose `HEALTHCHECK`; `/ready` = checks DB/upstreams
 * for Ansible rollout gating). Uses a plain, standalone `pg.Pool` — this
 * check is intentionally NOT routed through `withTenantSession`/
 * `withPlatformSession` (`@/lib/db`): it needs only raw connectivity, not an
 * RLS-scoped query, and must not fail if no tenant/platform context makes
 * sense for a readiness probe.
 */
let pool: Pool | null = null;

function getPool(): Pool | null {
	const url = config.db.runtimeUrl ?? config.db.url;

	if (!url) {
		return null;
	}

	if (!pool) {
		pool = new Pool({ connectionString: url });
	}

	return pool;
}

export async function checkDbConnectivity(): Promise<boolean> {
	const p = getPool();

	if (!p) {
		return false;
	}

	try {
		await p.query("select 1");
		return true;
	} catch {
		return false;
	}
}
