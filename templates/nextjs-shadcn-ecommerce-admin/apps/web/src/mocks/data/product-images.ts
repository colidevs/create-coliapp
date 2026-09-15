/**
 * In-memory `product-images` MSW fixture, matching this template's ACTUAL
 * generated `ProductImage` shape (`@/generated/model`). Linked to
 * `defaultProductSeed()`'s own product ids (`src/mocks/data/products.ts`) —
 * same seam `admin/product-images/repository.ts`'s real
 * `?productId=`-filtered `GET /admin/product-images` uses.
 */
export interface ProductImageRecord {
	id: string;
	productId: string;
	url: string;
	position: number;
	createdAt: string;
}

export function defaultProductImageSeed(): ProductImageRecord[] {
	const now = "2026-09-01T00:00:00.000Z";

	return [
		{
			id: "img-oak-chair-1",
			productId: "00000000-0000-4000-8000-000000000001",
			url: "https://images.colidevs.com/e2e/oak-dining-chair-1.jpg",
			position: 0,
			createdAt: now,
		},
		{
			id: "img-oak-chair-2",
			productId: "00000000-0000-4000-8000-000000000001",
			url: "https://images.colidevs.com/e2e/oak-dining-chair-2.jpg",
			position: 1,
			createdAt: now,
		},
		{
			id: "img-velvet-sofa-1",
			productId: "00000000-0000-4000-8000-000000000002",
			url: "https://images.colidevs.com/e2e/velvet-sofa-1.jpg",
			position: 0,
			createdAt: now,
		},
	];
}
