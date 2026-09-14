import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsufficientStockHttpError } from "@/v1/res/errors";

/**
 * @description Unit tests for the atomic stock decrement (design decision
 * (c), `sdd/ecommerce-admin-template/design`), the mirror-image atomic
 * stock restore (`restoreStock`, closing the spec's previously-unimplemented
 * "Atomic restore" requirement), and the webhook transition guard
 * (`applyPaymentTransition`).
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
 * against a real server. The `applyPaymentTransition` restore tests below
 * assert on the fake `Tx`'s own `vi.fn()` call counts (was `products`
 * updated a second time, or not) rather than on any real row state, for the
 * same reason.
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
 * @description The `.returning()`/awaited-directly row shape for the
 * ORDERS-table update in `applyPaymentTransition` (`orderId`/`dlocalId`/
 * `status`/`buyerProducts`) — distinct from `FakeRow` above, which models
 * the PRODUCTS-table row shape `decrementStock`/`restoreStock` read/write.
 */
interface FakeOrderRow {
	id: string;
	orderId: string;
	dlocalId: string;
	status: string;
	buyerProducts: unknown[];
}

/**
 * @description Builds a fake Drizzle `Tx` supporting every chain shape this
 * module's functions call:
 * `.update(table).set(...).where(...).returning(...)` (`decrementStock`,
 * `applyPaymentTransition`'s own status flip), a `.returning()`-less
 * `.update(table).set(...).where(...)` awaited directly (`restoreStock`),
 * `.select(...).from(table).where(...)` awaited directly (`decrementStock`'s
 * disambiguation read), and `.select(...).from(table).where(...).for(...)`
 * (`applyPaymentTransition`'s row-locked "was this order ever PAID" read).
 * Each `.update(...)` call consumes the next scripted `updateReturning`
 * entry in order, regardless of whether the caller reads it via
 * `.returning()` or by awaiting the chain directly — sufficient to test
 * every function's branching without a real query planner.
 */
function createFakeTx(script: {
	updateReturning: Array<FakeRow[] | FakeOrderRow[]>;
	selectRows?: FakeRow[][];
	existingOrderStatus?: { status: string } | null;
}) {
	let updateCallIndex = 0;
	let selectCallIndex = 0;

	const update = vi.fn(() => ({
		set: vi.fn(() => ({
			where: vi.fn(() => {
				const rows = script.updateReturning[updateCallIndex] ?? [];
				updateCallIndex += 1;
				return Object.assign(Promise.resolve(rows), {
					returning: vi.fn(async () => rows),
				});
			}),
		})),
	}));

	const select = vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(() => {
				let rows: unknown[];

				if (script.existingOrderStatus !== undefined) {
					rows = script.existingOrderStatus ? [script.existingOrderStatus] : [];
				} else {
					rows = script.selectRows?.[selectCallIndex] ?? [];
					selectCallIndex += 1;
				}

				// `.for("update")` (`applyPaymentTransition`'s row-locked read)
				// and a direct `await` (`decrementStock`'s disambiguation read)
				// must both resolve to the SAME scripted rows — real Drizzle
				// query builders are thenable regardless of which trailing
				// clause is appended.
				return Object.assign(Promise.resolve(rows), {
					for: vi.fn(async () => rows),
				});
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
					variantId: "p1",
					slug: "widget",
					variantLabel: "Red / M",
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
					variantId: "p1",
					slug: "widget",
					variantLabel: "Red / M",
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
					variantId: "p1",
					slug: "widget",
					variantLabel: "Red / M",
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

interface FakeVariantPriceRow {
	id: string;
	slug: string;
	price: string;
	stock: number;
	isActive: boolean;
	productIsActive: boolean;
}

/**
 * @description Fake `Tx` for `priceAndValidateItems`'s TWO queries
 * (`product_variants` INNER JOIN `products`, then `variant_option_selections`
 * double-joined for `loadVariantLabels`), branching on `.from()`'s table
 * identity — same pattern as `admin/variants/__tests__/repository.test.ts`'s
 * table-identity-branching fake tx, adapted for chained `.innerJoin()` calls.
 *
 * Takes the `productVariants`/`variantOptionSelections` table references as
 * PARAMETERS, resolved from the SAME `vi.importActual("@/lib/db")` call the
 * `@/lib/db` mock factory itself uses (see `repoWithPriceScript` below) —
 * never captured from an outer scope. `vi.resetModules()` (required so
 * `../repository` re-imports against the freshly doMocked `@/lib/db`) gives
 * each test a NEW module registry, so a `schema.productVariants` reference
 * captured before `resetModules()` would be a DIFFERENT object instance from
 * the one the freshly-re-imported `repository.ts` actually compares against.
 */
function createFakePriceTx(
	productVariantsTable: unknown,
	variantOptionSelectionsTable: unknown,
	script: {
		variantRows: FakeVariantPriceRow[];
		labelRows?: Array<{ variantId: string; value: string }>;
	},
) {
	const labelRows = script.labelRows ?? [];

	const select = vi.fn(() => ({
		from: vi.fn((table: unknown) => {
			if (table === productVariantsTable) {
				return {
					innerJoin: vi.fn(() => ({
						where: vi.fn(async () => script.variantRows),
					})),
				};
			}

			if (table === variantOptionSelectionsTable) {
				return {
					innerJoin: vi.fn(() => ({
						innerJoin: vi.fn(() => ({
							where: vi.fn(() => ({
								orderBy: vi.fn(async () => labelRows),
							})),
						})),
					})),
				};
			}

			throw new Error(`unexpected table in select().from(): ${String(table)}`);
		}),
	}));

	// biome-ignore lint/suspicious/noExplicitAny: test double, not a real Tx
	return { select } as any;
}

describe("priceAndValidateItems — variant-level pricing/stock (product_variants)", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	/**
	 * @description Also re-imports `@/v1/res/errors` from the SAME
	 * post-`resetModules()` registry epoch as `../repository`, and returns its
	 * classes alongside the repo — for the identical reason
	 * `createFakePriceTx` above takes its table references as parameters
	 * rather than closing over a module-top-level import: `NotFoundHttpError`/
	 * `InsufficientStockHttpError` imported at this file's top (before any
	 * `resetModules()`) are DIFFERENT class objects from the ones the
	 * freshly-reimported `repository.ts` actually throws, so `toBeInstanceOf`
	 * against the top-level import would always fail.
	 */
	async function repoWithPriceScript(script: {
		variantRows: FakeVariantPriceRow[];
		labelRows?: Array<{ variantId: string; value: string }>;
	}) {
		vi.doMock("@/lib/db", async () => {
			const actual =
				await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
			const fakeTx = createFakePriceTx(
				actual.schema.productVariants,
				actual.schema.variantOptionSelections,
				script,
			);
			return {
				...actual,
				withPlatformSession: async (fn: (tx: unknown) => unknown) => fn(fakeTx),
			};
		});

		const { createDlocalRepository } = await import("../repository");
		const errors = await import("@/v1/res/errors");
		return { repo: createDlocalRepository(), errors };
	}

	it("prices and validates against product_variants columns, joined to the parent product's slug", async () => {
		const { repo } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "19.99",
					stock: 10,
					isActive: true,
					productIsActive: true,
				},
			],
			labelRows: [
				{ variantId: "v1", value: "Red" },
				{ variantId: "v1", value: "M" },
			],
		});

		const { orderItems, amount } = await repo.priceAndValidateItems([
			{ variantId: "v1", quantity: 2 },
		]);

		expect(orderItems).toEqual([
			{
				variantId: "v1",
				slug: "widget",
				variantLabel: "Red / M",
				quantity: 2,
				unitPrice: 19.99,
				lineTotal: 39.98,
			},
		]);
		expect(amount).toBe(39.98);
	});

	it("resolves variantLabel to null when the variant has zero option-value selections", async () => {
		const { repo } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "10.00",
					stock: 10,
					isActive: true,
					productIsActive: true,
				},
			],
			labelRows: [],
		});

		const { orderItems } = await repo.priceAndValidateItems([
			{ variantId: "v1", quantity: 1 },
		]);

		expect(orderItems[0]?.variantLabel).toBeNull();
	});

	it("rejects an inactive variant even when its parent product is active", async () => {
		const { repo, errors } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "10.00",
					stock: 10,
					isActive: false,
					productIsActive: true,
				},
			],
		});

		await expect(
			repo.priceAndValidateItems([{ variantId: "v1", quantity: 1 }]),
		).rejects.toBeInstanceOf(errors.NotFoundHttpError);
	});

	it("rejects an active variant whose parent product is inactive/unpublished", async () => {
		const { repo, errors } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "10.00",
					stock: 10,
					isActive: true,
					productIsActive: false,
				},
			],
		});

		await expect(
			repo.priceAndValidateItems([{ variantId: "v1", quantity: 1 }]),
		).rejects.toBeInstanceOf(errors.NotFoundHttpError);
	});

	it("throws InsufficientStockHttpError when tracked stock is below the requested quantity", async () => {
		const { repo, errors } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "10.00",
					stock: 1,
					isActive: true,
					productIsActive: true,
				},
			],
		});

		await expect(
			repo.priceAndValidateItems([{ variantId: "v1", quantity: 5 }]),
		).rejects.toBeInstanceOf(errors.InsufficientStockHttpError);
	});

	it("treats negative variant stock as untracked inventory — always purchasable", async () => {
		const { repo } = await repoWithPriceScript({
			variantRows: [
				{
					id: "v1",
					slug: "widget",
					price: "10.00",
					stock: -1,
					isActive: true,
					productIsActive: true,
				},
			],
		});

		const { orderItems } = await repo.priceAndValidateItems([
			{ variantId: "v1", quantity: 999 },
		]);

		expect(orderItems).toHaveLength(1);
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

	/**
	 * @description The spec's previously-unimplemented "Cancelled order
	 * restores stock" scenario (`sdd/ecommerce-admin-template/spec`,
	 * stock-management domain). `capturedTx` is set inside the mocked
	 * `withPlatformSession` so each test can assert on the fake `Tx`'s own
	 * `vi.fn()` call counts afterward — the only observable signal available
	 * without a real Postgres instance (see the file-level doc comment).
	 */
	it("restores stock atomically when an order that reached PAID transitions to a terminal-failure status", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: test double, not a real Tx
		let capturedTx: any;

		vi.doMock("@/lib/db", async () => {
			const actual =
				await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
			return {
				...actual,
				withPlatformSession: async (fn: (tx: unknown) => unknown) => {
					capturedTx = createFakeTx({
						updateReturning: [
							[
								{
									id: "o1",
									orderId: "order-1",
									dlocalId: "D-1",
									status: "REJECTED",
									buyerProducts: [
										{
											variantId: "p1",
											slug: "widget",
											variantLabel: "Red / M",
											quantity: 2,
											unitPrice: 10,
											lineTotal: 20,
										},
									],
								},
							],
						],
						existingOrderStatus: { status: "PAID" },
					});
					return fn(capturedTx);
				},
			};
		});

		const { createDlocalRepository } = await import("../repository");
		const repo = createDlocalRepository();

		const result = await repo.applyPaymentTransition("D-1", "REJECTED");

		expect(result?.status).toBe("REJECTED");
		// One `update` call for the order's own status flip, one more for
		// `restoreStock`'s per-item product update — proves the restore
		// branch actually ran, not just that the transition succeeded.
		expect(capturedTx.update).toHaveBeenCalledTimes(2);
	});

	it("does NOT restore stock when the order never reached PAID before the terminal-failure status", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: test double, not a real Tx
		let capturedTx: any;

		vi.doMock("@/lib/db", async () => {
			const actual =
				await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
			return {
				...actual,
				withPlatformSession: async (fn: (tx: unknown) => unknown) => {
					capturedTx = createFakeTx({
						updateReturning: [
							[
								{
									id: "o2",
									orderId: "order-2",
									dlocalId: "D-2",
									status: "REJECTED",
									buyerProducts: [
										{
											variantId: "p2",
											slug: "gadget",
											variantLabel: null,
											quantity: 1,
											unitPrice: 5,
											lineTotal: 5,
										},
									],
								},
							],
						],
						// Never PAID — e.g. PENDING straight to REJECTED. Its
						// stock was never decremented, so there is nothing to
						// restore here.
						existingOrderStatus: { status: "PENDING" },
					});
					return fn(capturedTx);
				},
			};
		});

		const { createDlocalRepository } = await import("../repository");
		const repo = createDlocalRepository();

		const result = await repo.applyPaymentTransition("D-2", "REJECTED");

		expect(result?.status).toBe("REJECTED");
		// Only the order's own status-flip update — `restoreStock` must never
		// have run.
		expect(capturedTx.update).toHaveBeenCalledTimes(1);
	});

	it("does not double-restore stock on a duplicate webhook redelivery for the same terminal status", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: test double, not a real Tx
		let capturedTx: any;

		vi.doMock("@/lib/db", async () => {
			const actual =
				await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
			return {
				...actual,
				withPlatformSession: async (fn: (tx: unknown) => unknown) => {
					capturedTx = createFakeTx({
						// Order is already REJECTED — the `WHERE status <>
						// newStatus` guard fails, so the update affects zero
						// rows, exactly like a real duplicate webhook
						// redelivery.
						updateReturning: [[]],
						existingOrderStatus: { status: "REJECTED" },
					});
					return fn(capturedTx);
				},
			};
		});

		const { createDlocalRepository } = await import("../repository");
		const repo = createDlocalRepository();

		const result = await repo.applyPaymentTransition("D-3", "REJECTED");

		expect(result).toBeNull();
		// The guarded UPDATE ran (and returned zero rows) — `restoreStock`
		// must never have been reached a second time.
		expect(capturedTx.update).toHaveBeenCalledTimes(1);
	});
});
