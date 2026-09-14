import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createProductService } from "../service";
import type { Product } from "../types";

const FAKE_PRODUCT: Product = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Wireless Mouse",
	slug: "wireless-mouse",
	description: null,
	coverImage: null,
	categoryId: null,
	isActive: true,
	defaultPrice: 29.99,
	variantCount: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const FAKE_PAGE = {
	items: [FAKE_PRODUCT],
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
		getById: vi.fn(async () => FAKE_PRODUCT),
		create: vi.fn(async () => FAKE_PRODUCT),
		update: vi.fn(async () => FAKE_PRODUCT),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/products service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists products", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual(FAKE_PAGE);
	});

	it("creates a product", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(
			svc.create(admin, { name: "Wireless Mouse" }),
		).resolves.toEqual(FAKE_PRODUCT);
	});

	it("updates a product", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(
			svc.update(admin, FAKE_PRODUCT.id, { isActive: true }),
		).resolves.toEqual(FAKE_PRODUCT);
	});

	it("deletes a product", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(svc.delete(admin, FAKE_PRODUCT.id)).resolves.toBeUndefined();
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createProductService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});

describe("admin/products service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without Product write access", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(
			svc.create(viewer, { name: "Wireless Mouse" }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies update for a role without Product write access", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(
			svc.update(viewer, FAKE_PRODUCT.id, { isActive: true }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("denies delete for a role without Product write access", async () => {
		const repo = createFakeRepo();
		const svc = createProductService(repo);

		await expect(svc.delete(viewer, FAKE_PRODUCT.id)).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.delete).not.toHaveBeenCalled();
	});
});
