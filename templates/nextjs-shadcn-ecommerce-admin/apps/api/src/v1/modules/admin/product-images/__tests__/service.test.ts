import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createProductImageService } from "../service";
import type { ProductImage } from "../types";

const FAKE_PRODUCT_ID = "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c";

const FAKE_IMAGE: ProductImage = {
	id: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
	productId: FAKE_PRODUCT_ID,
	variantId: null,
	url: "https://images.example.com/wireless-mouse-1.jpg",
	position: 0,
	createdAt: "2026-01-01T00:00:00.000Z",
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		get: vi.fn(async () => [FAKE_IMAGE]),
		getById: vi.fn(async () => FAKE_IMAGE),
		create: vi.fn(async () => FAKE_IMAGE),
		update: vi.fn(async () => FAKE_IMAGE),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/product-images service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists product images", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual([FAKE_IMAGE]);
	});

	it("creates a product image", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(
			svc.create(admin, {
				productId: FAKE_PRODUCT_ID,
				url: FAKE_IMAGE.url,
			}),
		).resolves.toEqual(FAKE_IMAGE);
	});

	it("updates a product image", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(
			svc.update(admin, FAKE_IMAGE.id, { position: 1 }),
		).resolves.toEqual(FAKE_IMAGE);
	});

	it("deletes a product image", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(svc.delete(admin, FAKE_IMAGE.id)).resolves.toBeUndefined();
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createProductImageService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});

describe("admin/product-images service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without ProductImage write access", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(
			svc.create(viewer, {
				productId: FAKE_PRODUCT_ID,
				url: FAKE_IMAGE.url,
			}),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies delete for a role without ProductImage write access", async () => {
		const repo = createFakeRepo();
		const svc = createProductImageService(repo);

		await expect(svc.delete(viewer, FAKE_IMAGE.id)).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.delete).not.toHaveBeenCalled();
	});
});
