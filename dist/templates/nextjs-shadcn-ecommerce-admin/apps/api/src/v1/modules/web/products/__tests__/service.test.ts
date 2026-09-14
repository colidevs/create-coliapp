import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/v1/modules/admin/products/types";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "../repository";
import { createWebProductService } from "../service";

const FAKE_PRODUCT: Product = {
	id: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
	name: "Wireless Mouse",
	slug: "wireless-mouse",
	code: "WM-100",
	altCode: null,
	description: null,
	price: 29.99,
	stock: 10,
	stockMin: 2,
	coverImage: null,
	categoryId: null,
	isActive: true,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
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
