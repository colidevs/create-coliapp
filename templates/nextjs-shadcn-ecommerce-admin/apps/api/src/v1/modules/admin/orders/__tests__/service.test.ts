import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createOrderService } from "../service";
import type { Order } from "../types";

const FAKE_ORDER: Order = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	orderId: "order-2026-000123",
	mail: "jane@example.com",
	buyerInfo: {
		name: "Jane Doe",
		email: "jane@example.com",
		document: "12345678",
	},
	dlocalId: "D-4-e836ba0b-1f9b-4a3e",
	buyerProducts: [
		{
			variantId: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
			slug: "wireless-mouse",
			variantLabel: "Red / M",
			quantity: 2,
			unitPrice: 29.99,
			lineTotal: 59.98,
		},
	],
	status: "PAID",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:05:00.000Z",
};

const FAKE_PAGE = {
	items: [FAKE_ORDER],
	pagination: {
		page: 0,
		size: 10,
		count: 1,
		total: 1,
		next: 0,
		previous: 0,
	},
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		get: vi.fn(async () => FAKE_PAGE),
		getById: vi.fn(async () => FAKE_ORDER),
		...overrides,
	};
}

describe("admin/orders service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists orders (default pagination)", async () => {
		const repo = createFakeRepo();
		const svc = createOrderService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual(FAKE_PAGE);
		expect(repo.get).toHaveBeenCalledWith({});
	});

	it("lists orders filtered by status", async () => {
		const repo = createFakeRepo();
		const svc = createOrderService(repo);

		await expect(svc.get(admin, { status: "PAID" })).resolves.toEqual(
			FAKE_PAGE,
		);
		expect(repo.get).toHaveBeenCalledWith({ status: "PAID" });
	});

	it("gets an order by id, including its status", async () => {
		const repo = createFakeRepo();
		const svc = createOrderService(repo);

		await expect(svc.getById(admin, FAKE_ORDER.id)).resolves.toEqual(
			FAKE_ORDER,
		);
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createOrderService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});

describe("admin/orders service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	/**
	 * @description Unlike every other catalog subject (`Category`/`Product`/
	 * `ProductImage`/`Stock`), `"Order"` is deliberately NOT granted to the
	 * `"viewer"` role at all (`src/lib/ability.ts`) — orders carry buyer PII
	 * (`mail`/`buyerInfo`), so even the read-only list/get endpoints are
	 * admin-only. This asserts that restriction, not merely a write denial.
	 */
	it("denies list for a role without Order read access", async () => {
		const repo = createFakeRepo();
		const svc = createOrderService(repo);

		await expect(svc.get(viewer, {})).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.get).not.toHaveBeenCalled();
	});

	it("denies get-by-id for a role without Order read access", async () => {
		const repo = createFakeRepo();
		const svc = createOrderService(repo);

		await expect(svc.getById(viewer, FAKE_ORDER.id)).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.getById).not.toHaveBeenCalled();
	});
});
