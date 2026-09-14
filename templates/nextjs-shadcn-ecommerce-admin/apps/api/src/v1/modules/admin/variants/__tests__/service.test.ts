import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createVariantService } from "../service";
import type { Variant } from "../types";

const FAKE_VARIANT: Variant = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	productId: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
	code: "WM-100-RED-M",
	altCode: null,
	price: 29.99,
	stock: 42,
	stockMin: 5,
	isDefault: true,
	isActive: true,
	displayOrder: 0,
	optionValueIds: ["c1a2b3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		get: vi.fn(async () => [FAKE_VARIANT]),
		getById: vi.fn(async () => FAKE_VARIANT),
		create: vi.fn(async () => FAKE_VARIANT),
		update: vi.fn(async () => FAKE_VARIANT),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/variants service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists variants", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual([FAKE_VARIANT]);
	});

	it("lists variants scoped to one product", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await svc.get(admin, { productId: FAKE_VARIANT.productId });

		expect(repo.get).toHaveBeenCalledWith({
			productId: FAKE_VARIANT.productId,
		});
	});

	it("creates a variant with its option-value selections", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		const result = await svc.create(admin, {
			productId: FAKE_VARIANT.productId,
			price: 29.99,
			optionValueIds: FAKE_VARIANT.optionValueIds,
		});

		expect(result).toEqual(FAKE_VARIANT);
		expect(repo.create).toHaveBeenCalledWith({
			productId: FAKE_VARIANT.productId,
			price: 29.99,
			optionValueIds: FAKE_VARIANT.optionValueIds,
		});
	});

	it("updates a variant", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(
			svc.update(admin, FAKE_VARIANT.id, { price: 24.99 }),
		).resolves.toEqual(FAKE_VARIANT);
	});

	it("deletes a variant", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(svc.delete(admin, FAKE_VARIANT.id)).resolves.toBeUndefined();
		expect(repo.delete).toHaveBeenCalledWith(FAKE_VARIANT.id);
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createVariantService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("throws NotFoundHttpError when update affects nothing", async () => {
		const repo = createFakeRepo({ update: vi.fn(async () => null) });
		const svc = createVariantService(repo);

		await expect(
			svc.update(admin, "missing", { price: 1 }),
		).rejects.toBeInstanceOf(NotFoundHttpError);
	});

	it("throws NotFoundHttpError when delete affects nothing", async () => {
		const repo = createFakeRepo({ delete: vi.fn(async () => false) });
		const svc = createVariantService(repo);

		await expect(svc.delete(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("propagates the published-product invariant conflict from the repository unchanged", async () => {
		const { ProductRequiresActiveVariantHttpError } = await import(
			"@/v1/res/errors"
		);
		const repo = createFakeRepo({
			update: vi.fn(async () => {
				throw new ProductRequiresActiveVariantHttpError();
			}),
		});
		const svc = createVariantService(repo);

		await expect(
			svc.update(admin, FAKE_VARIANT.id, { isActive: false }),
		).rejects.toBeInstanceOf(ProductRequiresActiveVariantHttpError);
	});
});

describe("admin/variants service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without Variant write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(
			svc.create(viewer, { productId: FAKE_VARIANT.productId, price: 29.99 }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies update for a role without Variant write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(
			svc.update(viewer, FAKE_VARIANT.id, { price: 1 }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("denies delete for a role without Variant write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(svc.delete(viewer, FAKE_VARIANT.id)).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("allows read access for viewer", async () => {
		const repo = createFakeRepo();
		const svc = createVariantService(repo);

		await expect(svc.get(viewer, {})).resolves.toEqual([FAKE_VARIANT]);
	});
});
