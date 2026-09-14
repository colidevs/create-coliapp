import { describe, expect, it, vi } from "vitest";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createWebProductService } from "../service";
import type { PublicProduct } from "../types";

const FAKE_PRODUCT: PublicProduct = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Wireless Mouse",
	slug: "wireless-mouse",
	description: null,
	coverImage: null,
	categoryId: null,
	variants: [
		{
			id: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
			price: 29.99,
			stock: 10,
			isDefault: true,
			options: [],
		},
	],
};

const FAKE_PAGE = {
	items: [FAKE_PRODUCT],
	pagination: { page: 0, size: 10, count: 1, total: 1, next: 0, previous: 0 },
};

describe("web/products service", () => {
	it("lists active products via the repository", async () => {
		const repo: Repository = {
			getActive: vi.fn(async () => FAKE_PAGE),
			getActiveBySlug: vi.fn(async () => FAKE_PRODUCT),
		};
		const svc = createWebProductService(repo);

		await expect(svc.getActive({})).resolves.toEqual(FAKE_PAGE);
	});

	it("returns an active product by slug", async () => {
		const repo: Repository = {
			getActive: vi.fn(async () => FAKE_PAGE),
			getActiveBySlug: vi.fn(async () => FAKE_PRODUCT),
		};
		const svc = createWebProductService(repo);

		await expect(svc.getActiveBySlug("wireless-mouse")).resolves.toEqual(
			FAKE_PRODUCT,
		);
	});

	it("throws NotFoundHttpError when no active product matches the slug", async () => {
		const repo: Repository = {
			getActive: vi.fn(async () => FAKE_PAGE),
			getActiveBySlug: vi.fn(async () => null),
		};
		const svc = createWebProductService(repo);

		await expect(svc.getActiveBySlug("missing")).rejects.toBeInstanceOf(
			NotFoundHttpError,
		);
	});
});
