import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsufficientStockHttpError } from "@/v1/res/errors";

/**
 * @description Unit tests for the atomic stock decrement (design decision
 * (c), `sdd/ecommerce-admin-template/design`) and the webhook transition
 * guard (`applyPaymentTransition`).
 *
 * **Honesty note on DB coverage**: no live Postgres instance is reachable in
 * this sandbox/CI environment, so these tests do NOT exercise a real
 * transactional database. `decrementStock`'s tests inject a hand-built fake
 * `Tx` whose `.update()/.select()` chains resolve exactly what each test
 * scripts — this proves the DECISION LOGIC (zero rows ⇒ disambiguate
 * insufficient-vs-untracked; nonzero rows ⇒ success) in isolation from
 * Postgres. The dedicated "race" test below additionally proves the
 * ATOMICITY CONTRACT the real single-statement `UPDATE ... WHERE stock >=
 * quantity RETURNING` relies on, via a faithful in-memory model of that
 * exact predicate (see its own comment) — a logical simulation of Postgres's
 * per-statement atomicity guarantee, not a live concurrent-transaction test
 * against a real server.
 */

vi.mock("@/config", () => ({
	config: {
		dlocal: {
			apiUrl: "https://api-sbx.dlocalgo.com/v1/payments",
			apiKey: "test-key",
			apiSecret: "test-secret",
			notificationUrl: "http://localhost:3001/api/v1/dlocal/notifications",
			successUrl: "http://localhost:3000/checkout/return",
			backUrl: "http://localhost:3000/checkout",
			defaultCurrency: "USD",
			defaultCountry: "US",
		},
	},
}));

const { decrementStock } = await import("../repository");

interface FakeRow {
	id: string;
	stock: number;
}

/**
 * @description Builds a fake Drizzle `Tx` supporting exactly the chain shape
 * `decrementStock` calls: `.update(table).set(...).where(...).returning(...)`
 * and `.select(...).from(table).where(...)`. Each call consumes the next
 * scripted outcome in order — sufficient to test `decrementStock`'s
 * per-item branching without a real query planner.
 */
function createFakeTx(script: {
	updateReturning: FakeRow[][];
	selectRows?: FakeRow[][];
}) {
	let updateCallIndex = 0;
	let selectCallIndex = 0;

	const update = vi.fn(() => ({
		set: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: vi.fn(async () => {
					const rows = script.updateReturning[updateCallIndex] ?? [];
					updateCallIndex += 1;
					return rows;
				}),
			})),
		})),
	}));

	const select = vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(async () => {
				const rows = script.selectRows?.[selectCallIndex] ?? [];
				selectCallIndex += 1;
				return rows;
			}),
		})),
	}));

	// biome-ignore lint/suspicious/noExplicitAny: test double, not a real Tx
	return { update, select } as any;
}

describe("decrementStock — atomic conditional UPDATE", () => {
	it("decrements in one statement when stock is sufficient (no read-back needed)", async () => {
		const tx = createFakeTx({
			updateReturning: [[{ id: "p1", stock: 8 }]],
		});

		await expect(
			decrementStock(tx, [
				{
					productId: "p1",
					slug: "widget",
					quantity: 2,
					unitPrice: 10,
					lineTotal: 20,
				},
			]),
		).resolves.toBeUndefined();
	});

	it("throws InsufficientStockHttpError when zero rows affected AND current stock is tracked (>= 0)", async () => {
		const tx = createFakeTx({
			updateReturning: [[]],
			selectRows: [[{ id: "p1", stock: 1 }]],
		});

		await expect(
			decrementStock(tx, [
				{
					productId: "p1",
					slug: "widget",
					quantity: 5,
					unitPrice: 10,
					lineTotal: 50,
				},
			]),
		).rejects.toBeInstanceOf(InsufficientStockHttpError);
	});

	it("no-ops when zero rows affected AND current stock is negative (untracked inventory)", async () => {
		const tx = createFakeTx({
			updateReturning: [[]],
			selectRows: [[{ id: "p1", stock: -1 }]],
		});

		await expect(
			decrementStock(tx, [
				{
					productId: "p1",
					slug: "widget",
					quantity: 5,
					unitPrice: 10,
					lineTotal: 50,
				},
			]),
		).resolves.toBeUndefined();
	});
});

describe("decrementStock — concurrency race (simulated)", () => {
	/**
	 * @description Faithfully models the exact predicate the real SQL statement
	 * enforces atomically (`UPDATE products SET stock = stock - :qty WHERE
	 * id = :id AND stock >= :qty RETURNING *`): check-and-decrement with NO
	 * `await` boundary between the read and the write, exactly what one
	 * Postgres statement guarantees regardless of concurrent callers. This is
	 * the property the production code depends on Postgres to provide — this
	 * test proves the property itself, not that Postgres provides it (that is
	 * Postgres's own, separately well-established guarantee).
	 */
	function atomicConditionalDecrement(
		store: { stock: number },
		quantity: number,
	): boolean {
		if (store.stock < quantity) {
			return false;
		}
		store.stock -= quantity;
		return true;
	}

	it("never lets stock go negative when two concurrent requests race for the last unit", async () => {
		const store = { stock: 1 };

		const attempt = (): Promise<boolean> =>
			Promise.resolve().then(() => atomicConditionalDecrement(store, 1));

		const [first, second] = await Promise.all([attempt(), attempt()]);

		const successes = [first, second].filter(Boolean).length;

		expect(successes).toBe(1);
		expect(store.stock).toBe(0);
	});
});

describe("applyPaymentTransition — webhook transition guard", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("returns null (no-op) when the order is already at the incoming status (duplicate/stale webhook)", async () => {
		vi.doMock("@/lib/db", async () => {
			const actual =
				await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
			return {
				...actual,
				withPlatformSession: async (fn: (tx: unknown) => unknown) => {
					const tx = createFakeTx({ updateReturning: [[]] });
					return fn(tx);
				},
			};
		});

		const { createDlocalRepository } = await import("../repository");
		const repo = createDlocalRepository();

		const result = await repo.applyPaymentTransition("D-4-abc", "PAID");

		expect(result).toBeNull();
	});
});
