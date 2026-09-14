/**
 * In-memory `products` MSW fixture, matching this template's ACTUAL
 * generated `Product`/`ProductOutput` shape (`@/generated/model`) — mirrors
 * `nextjs-kumo-console`'s own `src/mocks/data/orders.ts` shape/posture.
 */
export interface ProductRecord {
	id: string;
	name: string;
	slug: string;
	code: string | null;
	altCode: string | null;
	description: string | null;
	price: number;
	stock: number;
	stockMin: number;
	coverImage: string | null;
	categoryId: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export function defaultProductSeed(): ProductRecord[] {
	const now = "2026-09-01T00:00:00.000Z";

	return [
		{
			id: "prod-oak-chair",
			name: "Oak Dining Chair",
			slug: "oak-dining-chair",
			code: "CHR-001",
			altCode: null,
			description: "Solid oak dining chair with a woven seat.",
			price: 129.99,
			stock: 12,
			stockMin: 2,
			coverImage: "https://images.colidevs.com/e2e/oak-dining-chair.jpg",
			categoryId: "cat-seating",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "prod-velvet-sofa",
			name: "Velvet Sofa",
			slug: "velvet-sofa",
			code: "SOF-002",
			altCode: null,
			description: "Three-seat sofa upholstered in emerald velvet.",
			price: 899.0,
			stock: 4,
			stockMin: 1,
			coverImage: "https://images.colidevs.com/e2e/velvet-sofa.jpg",
			categoryId: "cat-seating",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "prod-brass-lamp",
			name: "Brass Floor Lamp",
			slug: "brass-floor-lamp",
			code: "LMP-003",
			altCode: null,
			description: "Adjustable brass floor lamp with a linen shade.",
			price: 219.5,
			stock: 0,
			stockMin: 2,
			coverImage: "https://images.colidevs.com/e2e/brass-floor-lamp.jpg",
			categoryId: "cat-lighting",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	];
}

export const productsFixture: ProductRecord[] = defaultProductSeed();
