import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError, NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createCategoryService } from "../service";
import type { Category } from "../types";

const FAKE_CATEGORY: Category = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Electronics",
	slug: "electronics",
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function createFakeRepo(overrides: Partial<Repository> = {}): Repository {
	return {
		getAll: vi.fn(async () => [FAKE_CATEGORY]),
		getById: vi.fn(async () => FAKE_CATEGORY),
		create: vi.fn(async () => FAKE_CATEGORY),
		update: vi.fn(async () => FAKE_CATEGORY),
		delete: vi.fn(async () => true),
		...overrides,
	};
}

describe("admin/categories service — happy path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const admin = defineAbilityFor("admin");

	it("lists categories", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(svc.get(admin)).resolves.toEqual([FAKE_CATEGORY]);
	});

	it("creates a category", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		const result = await svc.create(admin, { name: "Electronics" });

		expect(result).toEqual(FAKE_CATEGORY);
		expect(repo.create).toHaveBeenCalledWith({ name: "Electronics" });
	});

	it("updates a category", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(
			svc.update(admin, FAKE_CATEGORY.id, { name: "Electronics" }),
		).resolves.toEqual(FAKE_CATEGORY);
	});

	it("deletes a category", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(svc.delete(admin, FAKE_CATEGORY.id)).resolves.toBeUndefined();
	});

	it("throws NotFoundHttpError when getById finds nothing", async () => {
		const repo = createFakeRepo({ getById: vi.fn(async () => null) });
		const svc = createCategoryService(repo);

		await expect(svc.getById(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});

	it("throws NotFoundHttpError when delete affects nothing", async () => {
		const repo = createFakeRepo({ delete: vi.fn(async () => false) });
		const svc = createCategoryService(repo);

		await expect(svc.delete(admin, "missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});

describe("admin/categories service — CASL denial", () => {
	const viewer = defineAbilityFor("viewer");

	it("denies create for a role without Category write access", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(
			svc.create(viewer, { name: "Electronics" }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it("denies update for a role without Category write access", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(
			svc.update(viewer, FAKE_CATEGORY.id, { name: "Electronics" }),
		).rejects.toBeInstanceOf(ForbiddenHttpError);
		expect(repo.update).not.toHaveBeenCalled();
	});

	it("denies delete for a role without Category write access", async () => {
		const repo = createFakeRepo();
		const svc = createCategoryService(repo);

		await expect(svc.delete(viewer, FAKE_CATEGORY.id)).rejects.toBeInstanceOf(
			ForbiddenHttpError,
		);
		expect(repo.delete).not.toHaveBeenCalled();
	});
});
