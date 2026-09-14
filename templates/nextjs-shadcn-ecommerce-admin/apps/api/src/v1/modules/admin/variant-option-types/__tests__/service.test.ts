import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createVariantOptionTypeService } from "../service";
import type { VariantOptionType } from "../types";

const FAKE_VARIANT_OPTION_TYPE: VariantOptionType = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Color",
	slug: "color",
	displayOrder: 0,
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		getAll: vi.fn(async () => [FAKE_VARIANT_OPTION_TYPE]),
		getById: vi.fn(async () => FAKE_VARIANT_OPTION_TYPE),
		create: vi.fn(async () => FAKE_VARIANT_OPTION_TYPE),
		update: vi.fn(async () => FAKE_VARIANT_OPTION_TYPE),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/variant-option-types service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists variant option types", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.get(admin)).resolves.toEqual([FAKE_VARIANT_OPTION_TYPE]);
	});

	it("creates a variant option type", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		const result = await svc.create(admin, { name: "Color" });

		expect(result).toEqual(FAKE_VARIANT_OPTION_TYPE);
		expect(repo.create).toHaveBeenCalledWith({ name: "Color" });
	});

	it("updates a variant option type", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(
			svc.update(admin, FAKE_VARIANT_OPTION_TYPE.id, { name: "Color" }),
		).resolves.toEqual(FAKE_VARIANT_OPTION_TYPE);
	});

	it("soft-deletes a variant option type", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(
			svc.delete(admin, FAKE_VARIANT_OPTION_TYPE.id),
		).resolves.toBeUndefined();
		expect(repo.delete).toHaveBeenCalledWith(FAKE_VARIANT_OPTION_TYPE.id);
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("throws NotFoundHttpError when delete affects nothing", async () => {
		const repo = createFakeRepo({ delete: vi.fn(async () => false) });
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.delete(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("propagates a duplicate-slug conflict from the repository unchanged", async () => {
		const { DuplicateSlugHttpError } = await import("@/v1/res/errors");
		const repo = createFakeRepo({
			create: vi.fn(async () => {
				throw new DuplicateSlugHttpError("color");
			}),
		});
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.create(admin, { name: "Color" })).rejects.toBeInstanceOf(
			DuplicateSlugHttpError,
		);
	});
});

describe("admin/variant-option-types service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.create(viewer, { name: "Color" })).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies update for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(
			svc.update(viewer, FAKE_VARIANT_OPTION_TYPE.id, { name: "Color" }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("denies delete for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(
			svc.delete(viewer, FAKE_VARIANT_OPTION_TYPE.id),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("allows read access for viewer", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionTypeService(repo);

		await expect(svc.get(viewer)).resolves.toEqual([FAKE_VARIANT_OPTION_TYPE]);
	});
});
