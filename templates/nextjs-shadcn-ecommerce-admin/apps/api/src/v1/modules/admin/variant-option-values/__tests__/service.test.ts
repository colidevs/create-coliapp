import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createVariantOptionValueService } from "../service";
import type { VariantOptionValue } from "../types";

const FAKE_VARIANT_OPTION_VALUE: VariantOptionValue = {
	id: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
	optionTypeId: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	value: "Red",
	slug: "red",
	imageUrl: null,
	description: null,
	displayOrder: 0,
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		get: vi.fn(async () => [FAKE_VARIANT_OPTION_VALUE]),
		getById: vi.fn(async () => FAKE_VARIANT_OPTION_VALUE),
		create: vi.fn(async () => FAKE_VARIANT_OPTION_VALUE),
		update: vi.fn(async () => FAKE_VARIANT_OPTION_VALUE),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/variant-option-values service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists variant option values", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(svc.get(admin, {})).resolves.toEqual([
			FAKE_VARIANT_OPTION_VALUE,
		]);
	});

	it("lists variant option values scoped to one option type", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await svc.get(admin, {
			optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
		});

		expect(repo.get).toHaveBeenCalledWith({
			optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
		});
	});

	it("creates a variant option value", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		const result = await svc.create(admin, {
			optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
			value: "Red",
		});

		expect(result).toEqual(FAKE_VARIANT_OPTION_VALUE);
		expect(repo.create).toHaveBeenCalledWith({
			optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
			value: "Red",
		});
	});

	it("updates a variant option value", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.update(admin, FAKE_VARIANT_OPTION_VALUE.id, { value: "Red" }),
		).resolves.toEqual(FAKE_VARIANT_OPTION_VALUE);
	});

	it("soft-deletes a variant option value", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.delete(admin, FAKE_VARIANT_OPTION_VALUE.id),
		).resolves.toBeUndefined();
		expect(repo.delete).toHaveBeenCalledWith(FAKE_VARIANT_OPTION_VALUE.id);
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createVariantOptionValueService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("throws NotFoundHttpError when delete affects nothing", async () => {
		const repo = createFakeRepo({ delete: vi.fn(async () => false) });
		const svc = createVariantOptionValueService(repo);

		await expect(svc.delete(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("propagates a duplicate-slug-per-option-type conflict from the repository unchanged", async () => {
		const { DuplicateSlugHttpError } = await import("@/v1/res/errors");
		const repo = createFakeRepo({
			create: vi.fn(async () => {
				throw new DuplicateSlugHttpError("red");
			}),
		});
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.create(admin, {
				optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
				value: "Red",
			}),
		).rejects.toBeInstanceOf(DuplicateSlugHttpError);
	});
});

describe("admin/variant-option-values service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.create(viewer, {
				optionTypeId: FAKE_VARIANT_OPTION_VALUE.optionTypeId,
				value: "Red",
			}),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies update for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.update(viewer, FAKE_VARIANT_OPTION_VALUE.id, { value: "Red" }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("denies delete for a role without VariantOptionType write access", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(
			svc.delete(viewer, FAKE_VARIANT_OPTION_VALUE.id),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.delete).not.toHaveBeenCalled();
	});

	it("allows read access for viewer", async () => {
		const repo = createFakeRepo();
		const svc = createVariantOptionValueService(repo);

		await expect(svc.get(viewer, {})).resolves.toEqual([
			FAKE_VARIANT_OPTION_VALUE,
		]);
	});
});
