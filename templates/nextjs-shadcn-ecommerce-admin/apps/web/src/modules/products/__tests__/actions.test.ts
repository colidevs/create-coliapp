import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicProducts = vi.fn();

vi.mock("@/generated/endpoints", () => ({
	listPublicProducts: (...args: unknown[]) => listPublicProducts(...args),
}));

// `actions.ts` also imports `toActionState` from `@/lib/problem` (used only
// by the admin actions below `listPublicProductsQuery`, not exercised by
// this test) — mocked out to avoid pulling in the real `@colidevs/utils`
// runtime, whose currently-published `dist/index.js` re-exports
// `"./aip160-filter"` with no `.js` extension, which Node's ESM resolver
// rejects. A real, separate `@colidevs/utils` packaging bug (`framework`
// repo) — out of scope for this fix, not worked around anywhere else.
vi.mock("@/lib/problem", () => ({ toActionState: vi.fn() }));

import { listPublicProductsQuery } from "@/modules/products/actions";

/**
 * Regression coverage for a real bug found live in the RopaStore pilot:
 * `apps/api`'s `web/products` repository paginates 0-based (`page ?? 0`),
 * while every storefront caller (`page.tsx`'s `HOME_PARAMS`,
 * `products/page.tsx`'s `toNumber(page, 1)` default,
 * `products-list-client.tsx`'s `pagination.page > 1`/`page - 1`/`page + 1`
 * display logic) is 1-based. Sending the UI's `page=1` unconverted skipped
 * the only page of real data — a 200 response with an empty `items[]` and a
 * nonzero `pagination.total`, not an infra/seed/config issue.
 */
describe("listPublicProductsQuery", () => {
	beforeEach(() => {
		listPublicProducts.mockReset();
	});

	it("converts the UI's 1-based page to the API's 0-based page before calling listPublicProducts", async () => {
		listPublicProducts.mockResolvedValue({
			status: 200,
			data: { items: [], pagination: { page: 0, size: 8, total: 4 } },
		});

		await listPublicProductsQuery({ page: 1, size: 8 });

		expect(listPublicProducts).toHaveBeenCalledWith({ page: 0, size: 8 });
	});

	it("converts the API's 0-based returned pagination.page back to 1-based", async () => {
		listPublicProducts.mockResolvedValue({
			status: 200,
			data: { items: [], pagination: { page: 0, size: 8, total: 4 } },
		});

		const result = await listPublicProductsQuery({ page: 1, size: 8 });

		expect(result.pagination.page).toBe(1);
	});

	it("leaves page untouched (undefined) when the caller omits it", async () => {
		listPublicProducts.mockResolvedValue({
			status: 200,
			data: { items: [], pagination: { page: 0, size: 10, total: 4 } },
		});

		await listPublicProductsQuery(undefined);

		expect(listPublicProducts).toHaveBeenCalledWith({});
	});
});
