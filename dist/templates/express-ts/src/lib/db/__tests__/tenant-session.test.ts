import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { schema, withPlatformSession, withTenantSession } from "@/lib/db";

/**
 * @description Real-Postgres integration test for the RLS session pattern
 * (ADR 0014 / design D4). Requires a running Postgres with:
 *   1. `drizzle/0000_init.sql` + `drizzle/0001_rls_roles.sql` already applied
 *      (`pnpm db:migrate` with `DATABASE_OWNER_URL` set), and
 *   2. `DATABASE_RUNTIME_URL` pointing at the `app_runtime` role created by
 *      that second migration.
 *
 * Locally:
 *   docker run --rm -d --name coliapp-test-pg -e POSTGRES_PASSWORD=owner_pw \
 *     -e POSTGRES_USER=app_owner -e POSTGRES_DB=appdb -p 15432:5432 postgres:16-alpine
 *   DATABASE_OWNER_URL=postgres://app_owner:owner_pw@localhost:15432/appdb pnpm db:migrate
 *   DATABASE_OWNER_URL=... DATABASE_RUNTIME_URL=postgres://app_runtime:change_me_in_infisical@localhost:15432/appdb pnpm test
 *
 * Not wired into this template's CI by default — no Postgres service is
 * currently provisioned in `create-coliapp`'s GH Actions workflow. Skipped
 * automatically (not faked as passing) when the two env vars above are
 * absent, which is the expected state in an ordinary `pnpm test` run.
 */
const ownerUrl = process.env.DATABASE_OWNER_URL;
const runtimeUrl = process.env.DATABASE_RUNTIME_URL;
const hasRealPostgres = Boolean(ownerUrl && runtimeUrl);

describe.skipIf(!hasRealPostgres)(
	"withTenantSession — RLS enforcement (real Postgres)",
	() => {
		const tenantA = randomUUID();
		const tenantB = randomUUID();
		let ownerPool: Pool;

		beforeAll(async () => {
			// `DATABASE_RUNTIME_URL` must already be set in the process
			// environment BEFORE the test runner starts — `@/config` reads
			// `process.env` at import time, so mutating it here would be too
			// late for `src/lib/db/client.ts`'s already-cached Drizzle instance.
			ownerPool = new Pool({ connectionString: ownerUrl });

			await ownerPool.query(
				"insert into orders (tenant_id, name) values ($1, 'a-order'), ($2, 'b-order')",
				[tenantA, tenantB],
			);
		});

		afterAll(async () => {
			await ownerPool.query("delete from orders where tenant_id in ($1, $2)", [
				tenantA,
				tenantB,
			]);
			await ownerPool.end();
		});

		it("runtime role is NOT the table owner (a prerequisite for FORCE RLS to matter)", async () => {
			const { rows } = await ownerPool.query<{ tableowner: string }>(
				"select tableowner from pg_tables where tablename = 'orders'",
			);
			const { rows: roleRows } = await ownerPool.query<{
				rolbypassrls: boolean;
			}>("select rolbypassrls from pg_roles where rolname = 'app_runtime'");

			expect(rows[0]?.tableowner).not.toBe("app_runtime");
			expect(roleRows[0]?.rolbypassrls).toBe(false);
		});

		it("returns only the requesting tenant's rows (cross-tenant read = 0)", async () => {
			const rowsForA = await withTenantSession(
				{ tenantId: tenantA },
				async (tx) =>
					tx.select().from(schema.orders).where(sql`tenant_id = ${tenantB}`),
			);

			expect(rowsForA).toHaveLength(0);

			const rowsForOwnTenant = await withTenantSession(
				{ tenantId: tenantA },
				async (tx) =>
					tx.select().from(schema.orders).where(sql`tenant_id = ${tenantA}`),
			);

			expect(rowsForOwnTenant).toHaveLength(1);
		});

		it("returns zero rows with no tenant session set (fail-closed, never fail-open)", async () => {
			const rows = await withPlatformSession(async (tx) =>
				tx.select().from(schema.orders),
			);

			expect(rows).toHaveLength(0);
		});

		it("does not leak tenant context across a pooled connection reused after commit", async () => {
			// Run tenant A's session first — the pool may reuse the exact same
			// physical connection for the very next `withTenantSession` call.
			await withTenantSession({ tenantId: tenantA }, async (tx) =>
				tx.select().from(schema.orders),
			);

			// A subsequent call with NO tenant context (platform session) must
			// see zero rows, proving the previous transaction's
			// `set_config(..., true)` (transaction-scoped) did not survive
			// past COMMIT onto the reused connection.
			const rows = await withPlatformSession(async (tx) =>
				tx.select().from(schema.orders),
			);

			expect(rows).toHaveLength(0);
		});
	},
);

describe("withTenantSession — input validation (no DB required)", () => {
	it("rejects an empty tenantId before ever opening a transaction", async () => {
		await expect(
			withTenantSession({ tenantId: "" }, async () => {
				throw new Error("fn must not run without a tenantId");
			}),
		).rejects.toThrow();
	});
});
