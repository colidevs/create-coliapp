import { describe, expect, it, vi } from "vitest";
import type { Category } from "@/v1/modules/admin/categories/types";
import type { Repository } from "../repository";
import { createWebCategoryService } from "../service";

const FAKE_CATEGORY: Category = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Electronics",
	slug: "electronics",
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("web/categories service", () => {
	it("returns only active categories from the repository", async () => {
		const repo: Repository = { getActive: vi.fn(async () => [FAKE_CATEGORY]) };
		const svc = createWebCategoryService(repo);

		await expect(svc.getActive()).resolves.toEqual([FAKE_CATEGORY]);
	});
});
