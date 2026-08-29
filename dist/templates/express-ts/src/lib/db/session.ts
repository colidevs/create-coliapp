import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { RequiredError } from "@/v1/res/errors";
import { getDb, type schema } from "./client";

export type Tx = Parameters<
	Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0];

export interface TenantCtx {
	tenantId: string;
	userId?: string;
}

/**
 * @description The RLS enforcement boundary (ADR 0014 / design D4). Runs
 * `fn` inside an explicit transaction, with `set_config('app.tenant_id', …)`
 * as the FIRST statement of that transaction — transaction-scoped (`true`
 * as the third arg to `set_config`, i.e. `is_local`), never session-level
 * `SET`, because:
 *
 * 1. `SET LOCAL`/session `SET` cannot bind query parameters — this
 *    parameterizes via Drizzle's `sql` tag (`${ctx.tenantId}`), which becomes
 *    a real bound parameter, never string-interpolated SQL.
 * 2. A session-level `SET` on a pooled connection (transaction-mode pgbouncer
 *    or an app-level `pg.Pool`) leaks the tenant context to the NEXT borrower
 *    of that same physical connection. Transaction-scoped `set_config`
 *    (`is_local = true`) is automatically discarded on COMMIT/ROLLBACK, so a
 *    pool can safely reuse the connection right after.
 *
 * Postgres RLS policies read this via
 * `current_setting('app.tenant_id', true)::uuid = tenant_id` — the `true`
 * (missing_ok) argument means a NEVER-set value returns `NULL`, and
 * `NULL = tenant_id` is always `NULL` (falsy) in a `USING` clause: fail
 * CLOSED (zero rows), never fail open. `FORCE ROW LEVEL SECURITY` on the
 * table (`drizzle/0001_rls_roles.sql`) is what makes this apply even to the
 * table owner — without it, the policy would be silently skipped for owners.
 *
 * IMPORTANT (found by testing against a real Postgres 16, not assumed):
 * on a connection REUSED after a prior `withTenantSession` transaction,
 * `current_setting('app.tenant_id', true)` reverts to `''` (empty string)
 * after COMMIT, not back to NULL — referencing a custom GUC once
 * materializes it as a real session-scoped parameter, and `''::uuid` would
 * THROW rather than silently returning zero rows. A first-attempt
 * `current_setting(...) <> '' AND ...::uuid` guard, assuming left-to-right
 * short-circuit, was ALSO verified wrong against a real Postgres 16 —
 * Postgres does not guarantee AND/OR evaluation order. See
 * `drizzle/0001_rls_roles.sql`'s policy: it uses `NULLIF(value, '')::uuid`
 * instead, which converts `''` into a real `NULL` before any cast is
 * attempted, so both the never-set and reset-after-commit cases collapse
 * to the same clean zero-rows result without ever throwing.
 *
 * The raw Drizzle instance is intentionally never exposed here or from
 * `./index.ts` — only this function and `withPlatformSession` are the public
 * surface, so RLS bypass requires deliberately reaching into `./client.ts`
 * (an internal module), not an accidental missed check at a call site.
 */
export async function withTenantSession<T>(
	ctx: TenantCtx,
	fn: (tx: Tx) => Promise<T>,
): Promise<T> {
	if (!ctx.tenantId) {
		throw new RequiredError("tenantId");
	}

	const db = getDb();

	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select set_config('app.tenant_id', ${ctx.tenantId}, true), set_config('app.user_id', ${ctx.userId ?? ""}, true)`,
		);

		return fn(tx);
	});
}

/**
 * @description Explicit escape hatch for genuinely cross-tenant/platform-level
 * operations (e.g. an internal admin job). Named loudly on purpose — grepping
 * the codebase for `withPlatformSession` should be a deliberate, reviewable
 * event, unlike a plain, easy-to-miss `withTenantSession(undefined, ...)`
 * would be. Does NOT set `app.tenant_id`, so RLS policies see it unset and
 * every tenant-scoped table still returns zero rows through this path unless
 * the connecting role also has an explicit BYPASSRLS grant or a policy that
 * intentionally allows platform-role access — that grant is an infra/DBA
 * decision, not something this helper does implicitly.
 */
export async function withPlatformSession<T>(
	fn: (tx: Tx) => Promise<T>,
): Promise<T> {
	const db = getDb();

	return db.transaction(async (tx) => fn(tx));
}
