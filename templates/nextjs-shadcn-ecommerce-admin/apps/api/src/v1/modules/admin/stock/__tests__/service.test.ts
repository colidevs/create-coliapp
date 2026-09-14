import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createStockService } from "../service";
import type { StockItem } from "../types";

const FAKE_STOCK_ITEM: StockItem = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Wireless Mouse",
	slug: "wireless-mouse",
	stock: 10,
	stockMin: 2,
	code: "WM-100",
	altCode: null,
	coverImage: null,
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		get: vi.fn(async () => [FAKE_STOCK_ITEM]),
		getById: vi.fn(async () => FAKE_STOCK_ITEM),
		update: vi.fn(async () => FAKE_STOCK_ITEM),
		...overrides,
	};
}

describe("admin/stock service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists stock items", async () => {
		const repo = createFakeRepo();
		const svc = createStockService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual([FAKE_STOCK_ITEM]);
	});

	it("updates a stock item", async () => {
		const repo = createFakeRepo();
		const svc = createStockService(repo);

		await expect(
			svc.update(admin, FAKE_STOCK_ITEM.id, { stock: 5, stockMin: 1 }),
		).resolves.toEqual(FAKE_STOCK_ITEM);
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createStockService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});

describe("admin/stock service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies update for a role without Stock write access", async () => {
		const repo = createFakeRepo();
		const svc = createStockService(repo);

		await expect(
			svc.update(viewer, FAKE_STOCK_ITEM.id, { stock: 5, stockMin: 1 }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});
});
