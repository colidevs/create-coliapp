/**
 * In-memory `products` MSW fixture, matching this template's ACTUAL
 * generated `Product`/`ProductOutput` shape (`@/generated/model`).
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, design D3/D4, task 9.3)**:
 * `code`/`altCode`/`price`/`stock`/`stockMin` are DROPPED — those moved to
 * `product_variants` (`./variants.ts`). `defaultPrice`/`variantCount` are
 * derived at read time by `handlers/admin.ts`/`handlers/storefront.ts` from
 * `variantsFixture`, never stored here — same "no stored rollup" invariant
 * the real API enforces (design D4).
 *
 * **IDs are real (unprefixed) UUIDs, not the `prod-`-prefixed convention
 * this fixture used before this change** — `variantFormSchema.productId`
 * (`modules/variants/types.ts`) validates as `z.uuid()`, same footgun PR8
 * found for `optionTypeId`. Kept deterministic/readable for tests via a
 * `00000000-0000-4000-8000-...` pattern rather than `crypto.randomUUID()`,
 * so `variants.ts`/`variant-option-types.ts`/E2E specs can reference them
 * as stable literals.
 */
export interface ProductRecord {
	id: string;
	name: string;
	slug: string;
	description: string | null;
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
			id: "00000000-0000-4000-8000-000000000001",
			name: "Oak Dining Chair",
			slug: "oak-dining-chair",
			description: "Solid oak dining chair with a woven seat.",
			coverImage: "https://images.colidevs.com/e2e/oak-dining-chair.jpg",
			categoryId: "cat-seating",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "00000000-0000-4000-8000-000000000002",
			name: "Velvet Sofa",
			slug: "velvet-sofa",
			description: "Three-seat sofa upholstered in emerald velvet.",
			coverImage: "https://images.colidevs.com/e2e/velvet-sofa.jpg",
			categoryId: "cat-seating",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "00000000-0000-4000-8000-000000000003",
			name: "Brass Floor Lamp",
			slug: "brass-floor-lamp",
			description: "Adjustable brass floor lamp with a linen shade.",
			coverImage: "https://images.colidevs.com/e2e/brass-floor-lamp.jpg",
			categoryId: "cat-lighting",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	];
}

export const productsFixture: ProductRecord[] = defaultProductSeed();
