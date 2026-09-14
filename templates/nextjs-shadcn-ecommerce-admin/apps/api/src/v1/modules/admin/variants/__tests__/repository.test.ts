import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductRequiresActiveVariantHttpError } from "@/v1/res/errors";

/**
 * @description Unit tests for `./repository.ts`'s DB-transaction-level
 * logic — set-replacement of `variant_option_selections`, the single-default
 * swap (design D7), and propagation of the deferred `23514` check-violation
 * as `ProductRequiresActiveVariantHttpError`.
 *
 * **Honesty note on DB coverage** (same posture as `Dlocal/__tests__/
 * repository.test.ts`): no live Postgres instance is reachable in this
 * sandbox/CI environment. Each test injects a hand-built fake `Tx` whose
 * `.select()/.insert()/.update()/.delete()` chains resolve exactly what that
 * test scripts, branching on TABLE IDENTITY (the real `schema.productVariants`/
 * `schema.variantOptionSelections` objects — captured ONCE below, from the
 * SAME `vi.importActual` call `@/lib/db`'s single mock factory also uses, so
 * every test compares against the exact object instance the repository
 * itself receives; never re-derived per test) rather than re-implementing a
 * query planner. This proves the repository's own DECISION LOGIC (call
 * ordering, which table/values each operation touches, and how a `23514`
 * propagates) in isolation from Postgres — not the real deferred-
 * constraint-trigger COMMIT timing itself, which only a live database can
 * exercise.
 */

vi.mock("@/config", () => ({ config: {} }));

let currentTx: unknown;

vi.doMock("@/lib/db", async () => {
	const actual = await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
	return {
		...actual,
		withPlatformSession: async (fn: (tx: unknown) => unknown) => fn(currentTx),
	};
});

const dbActual = await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
const { productVariants, variantOptionSelections } = dbActual.schema;
const { createVariantRepository } = await import("../repository");
const repo = createVariantRepository();

interface FakeVariantRow {
	id: string;
	productId: string;
	code: string | null;
	altCode: string | null;
	price: string;
	stock: number;
	stockMin: number;
	isDefault: boolean;
	isActive: boolean;
	displayOrder: number;
	createdAt: Date;
	updatedAt: Date;
}

const EXISTING_VARIANT: FakeVariantRow = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	productId: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
	code: "WM-100-RED-M",
	altCode: null,
	price: "29.99",
	stock: 42,
	stockMin: 5,
	isDefault: false,
	isActive: true,
	displayOrder: 0,
	createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-01T00:00:00Z"),
};

type CallRecord =
	| { op: "select"; table: unknown }
	| { op: "insert"; table: unknown; values: unknown }
	| { op: "update"; table: unknown; values: unknown }
	| { op: "delete"; table: unknown };

/**
 * @description A single generic fake `Tx` builder covering every chain
 * shape this repository calls: `.select().from(t).where()` (thenable),
 * `.insert(t).values(v)` (thenable, `.returning()` optional),
 * `.update(t).set(v).where()` (thenable, `.returning()` optional), and
 * `.delete(t).where()` (thenable, `.returning()` optional). Script functions
 * receive the table reference so a single fake instance can answer for both
 * `productVariants` and `variantOptionSelections` in the same test.
 */
function createFakeTx(script: {
	selectFor?: (table: unknown) => unknown[];
	insertReturning?: (table: unknown) => unknown[];
	updateReturning?: (table: unknown) => unknown[];
	deleteReturning?: (table: unknown) => unknown[];
	throwOn?: { op: "insert" | "update" | "delete"; table: unknown };
}) {
	const calls: CallRecord[] = [];

	function thenableRows(rows: unknown[]) {
		return Object.assign(Promise.resolve(rows), {
			returning: vi.fn(async () => rows),
		});
	}

	const tx = {
		select: vi.fn(() => ({
			from: vi.fn((table: unknown) => ({
				where: vi.fn(() => {
					calls.push({ op: "select", table });
					return Promise.resolve(script.selectFor?.(table) ?? []);
				}),
			})),
		})),
		insert: vi.fn((table: unknown) => ({
			values: vi.fn((values: unknown) => {
				calls.push({ op: "insert", table, values });
				if (script.throwOn?.op === "insert" && script.throwOn.table === table) {
					return Object.assign(Promise.resolve([]), {
						returning: vi.fn(async () => {
							throw { code: "23514" };
						}),
					});
				}
				return thenableRows(script.insertReturning?.(table) ?? []);
			}),
		})),
		update: vi.fn((table: unknown) => ({
			set: vi.fn((values: unknown) => ({
				where: vi.fn(() => {
					calls.push({ op: "update", table, values });
					if (
						script.throwOn?.op === "update" &&
						script.throwOn.table === table
					) {
						return Object.assign(Promise.resolve([]), {
							returning: vi.fn(async () => {
								throw { code: "23514" };
							}),
						});
					}
					return thenableRows(script.updateReturning?.(table) ?? []);
				}),
			})),
		})),
		delete: vi.fn((table: unknown) => ({
			where: vi.fn(() => {
				calls.push({ op: "delete", table });
				if (script.throwOn?.op === "delete" && script.throwOn.table === table) {
					return Object.assign(Promise.resolve([]), {
						returning: vi.fn(async () => {
							throw { code: "23514" };
						}),
					});
				}
				return thenableRows(script.deleteReturning?.(table) ?? []);
			}),
		})),
	};

	return { tx, calls };
}

describe("admin/variants repository — single-default swap (design D7)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("create() clears the sibling default BEFORE inserting a new default variant", async () => {
		const insertedRow: FakeVariantRow = {
			...EXISTING_VARIANT,
			isDefault: true,
		};
		const { tx, calls } = createFakeTx({
			insertReturning: (table) =>
				table === productVariants ? [insertedRow] : [],
		});
		currentTx = tx;

		const result = await repo.create({
			productId: EXISTING_VARIANT.productId,
			price: 29.99,
			isDefault: true,
			optionValueIds: ["ov-1", "ov-2"],
		});

		const clearCallIndex = calls.findIndex(
			(c) => c.op === "update" && c.table === productVariants,
		);
		const insertCallIndex = calls.findIndex(
			(c) => c.op === "insert" && c.table === productVariants,
		);

		expect(clearCallIndex).toBeGreaterThanOrEqual(0);
		expect(insertCallIndex).toBeGreaterThan(clearCallIndex);
		expect(
			(calls[clearCallIndex] as { values: { isDefault: boolean } }).values
				.isDefault,
		).toBe(false);

		const selectionsInsert = calls.find(
			(c) => c.op === "insert" && c.table === variantOptionSelections,
		) as { values: Array<{ variantId: string; optionValueId: string }> };
		expect(selectionsInsert.values).toEqual([
			{ variantId: insertedRow.id, optionValueId: "ov-1" },
			{ variantId: insertedRow.id, optionValueId: "ov-2" },
		]);

		expect(result.isDefault).toBe(true);
		expect(result.optionValueIds).toEqual(["ov-1", "ov-2"]);
		expect(result.price).toBe(29.99);
	});

	it("create() does not touch other variants when isDefault is omitted", async () => {
		const insertedRow: FakeVariantRow = { ...EXISTING_VARIANT };
		const { tx, calls } = createFakeTx({
			insertReturning: (table) =>
				table === productVariants ? [insertedRow] : [],
		});
		currentTx = tx;

		await repo.create({ productId: EXISTING_VARIANT.productId, price: 29.99 });

		expect(calls.some((c) => c.op === "update")).toBe(false);
	});

	it("update() clears the sibling default, excluding itself, when isDefault is set to true", async () => {
		const updatedRow: FakeVariantRow = { ...EXISTING_VARIANT, isDefault: true };
		const { tx, calls } = createFakeTx({
			selectFor: (table) =>
				table === productVariants
					? [EXISTING_VARIANT]
					: table === variantOptionSelections
						? []
						: [],
			updateReturning: (table) =>
				table === productVariants ? [updatedRow] : [],
		});
		currentTx = tx;

		const result = await repo.update(EXISTING_VARIANT.id, { isDefault: true });

		const updateCalls = calls.filter(
			(c) => c.op === "update" && c.table === productVariants,
		) as Array<{ values: { isDefault?: boolean } }>;

		// One call clears the sibling default (`isDefault: false`), one call
		// applies the requested update (`isDefault: true`) — two distinct
		// `tx.update(productVariants)` invocations, never one combined write.
		expect(updateCalls).toHaveLength(2);
		expect(updateCalls[0].values.isDefault).toBe(false);
		expect(updateCalls[1].values.isDefault).toBe(true);
		expect(result?.isDefault).toBe(true);
	});

	it("update() does not clear any default when isDefault is not provided", async () => {
		const updatedRow: FakeVariantRow = { ...EXISTING_VARIANT, price: "24.99" };
		const { tx, calls } = createFakeTx({
			selectFor: (table) =>
				table === productVariants
					? [EXISTING_VARIANT]
					: table === variantOptionSelections
						? []
						: [],
			updateReturning: (table) =>
				table === productVariants ? [updatedRow] : [],
		});
		currentTx = tx;

		await repo.update(EXISTING_VARIANT.id, { price: 24.99 });

		const updateCalls = calls.filter(
			(c) => c.op === "update" && c.table === productVariants,
		);
		expect(updateCalls).toHaveLength(1);
	});
});

describe("admin/variants repository — selection set-replacement on update", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("replaces the entire selection set (delete-then-insert) when optionValueIds is provided", async () => {
		const updatedRow: FakeVariantRow = { ...EXISTING_VARIANT };
		const { tx, calls } = createFakeTx({
			selectFor: (table) =>
				table === productVariants ? [EXISTING_VARIANT] : [],
			updateReturning: (table) =>
				table === productVariants ? [updatedRow] : [],
		});
		currentTx = tx;

		const result = await repo.update(EXISTING_VARIANT.id, {
			optionValueIds: ["ov-3"],
		});

		const deleteIndex = calls.findIndex(
			(c) => c.op === "delete" && c.table === variantOptionSelections,
		);
		const insertIndex = calls.findIndex(
			(c) => c.op === "insert" && c.table === variantOptionSelections,
		);

		expect(deleteIndex).toBeGreaterThanOrEqual(0);
		expect(insertIndex).toBeGreaterThan(deleteIndex);
		expect(
			(
				calls[insertIndex] as {
					values: Array<{ variantId: string; optionValueId: string }>;
				}
			).values,
		).toEqual([{ variantId: EXISTING_VARIANT.id, optionValueId: "ov-3" }]);
		expect(result?.optionValueIds).toEqual(["ov-3"]);
	});

	it("replaces the selection set with zero rows (delete, no insert) when optionValueIds is an empty array", async () => {
		const updatedRow: FakeVariantRow = { ...EXISTING_VARIANT };
		const { tx, calls } = createFakeTx({
			selectFor: (table) =>
				table === productVariants ? [EXISTING_VARIANT] : [],
			updateReturning: (table) =>
				table === productVariants ? [updatedRow] : [],
		});
		currentTx = tx;

		const result = await repo.update(EXISTING_VARIANT.id, {
			optionValueIds: [],
		});

		expect(
			calls.some(
				(c) => c.op === "delete" && c.table === variantOptionSelections,
			),
		).toBe(true);
		expect(
			calls.some(
				(c) => c.op === "insert" && c.table === variantOptionSelections,
			),
		).toBe(false);
		expect(result?.optionValueIds).toEqual([]);
	});

	it("leaves existing selections untouched (no delete/insert) when optionValueIds is omitted", async () => {
		const updatedRow: FakeVariantRow = { ...EXISTING_VARIANT, price: "19.99" };
		const { tx, calls } = createFakeTx({
			selectFor: (table) =>
				table === productVariants
					? [EXISTING_VARIANT]
					: table === variantOptionSelections
						? [{ variantId: EXISTING_VARIANT.id, optionValueId: "ov-9" }]
						: [],
			updateReturning: (table) =>
				table === productVariants ? [updatedRow] : [],
		});
		currentTx = tx;

		const result = await repo.update(EXISTING_VARIANT.id, { price: 19.99 });

		expect(
			calls.some(
				(c) => c.op === "delete" && c.table === variantOptionSelections,
			),
		).toBe(false);
		expect(result?.optionValueIds).toEqual(["ov-9"]);
	});
});

describe("admin/variants repository — published-product invariant (23514)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("update() maps a 23514 check-violation to ProductRequiresActiveVariantHttpError", async () => {
		const { tx } = createFakeTx({
			selectFor: (table) =>
				table === productVariants ? [EXISTING_VARIANT] : [],
			throwOn: { op: "update", table: productVariants },
		});
		currentTx = tx;

		await expect(
			repo.update(EXISTING_VARIANT.id, { isActive: false }),
		).rejects.toBeInstanceOf(ProductRequiresActiveVariantHttpError);
	});

	it("delete() maps a 23514 check-violation to ProductRequiresActiveVariantHttpError", async () => {
		const { tx } = createFakeTx({
			throwOn: { op: "delete", table: productVariants },
		});
		currentTx = tx;

		await expect(repo.delete(EXISTING_VARIANT.id)).rejects.toBeInstanceOf(
			ProductRequiresActiveVariantHttpError,
		);
	});

	it("create() propagates a raw 23514-shaped error unchanged — the trigger never fires on INSERT, so create() carries no catch for it", async () => {
		const { tx } = createFakeTx({
			throwOn: { op: "insert", table: productVariants },
		});
		currentTx = tx;

		// If create() had (wrongly) copied update()/delete()'s outer catch,
		// this would reject with ProductRequiresActiveVariantHttpError
		// instead of the raw driver-shaped error below.
		await expect(
			repo.create({ productId: EXISTING_VARIANT.productId, price: 29.99 }),
		).rejects.not.toBeInstanceOf(ProductRequiresActiveVariantHttpError);
		await expect(
			repo.create({ productId: EXISTING_VARIANT.productId, price: 29.99 }),
		).rejects.toMatchObject({ code: "23514" });
	});
});
