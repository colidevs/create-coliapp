import {
	LARGE_VALUE_ID,
	NATURAL_VALUE_ID,
	SMALL_VALUE_ID,
	WALNUT_VALUE_ID,
} from "./variant-option-types";

/**
 * In-memory `product_variants` MSW fixture, matching this template's ACTUAL
 * generated `Variant` shape (`@/generated/model`). The sellable unit —
 * `code`/`altCode`/`price`/`stock`/`stockMin` moved here from
 * `./products.ts` (design D3/D4) — `handlers/admin.ts`/`handlers/
 * storefront.ts` derive a product's `defaultPrice`/`variantCount` (admin)
 * and its public `variants[]` (storefront) from this collection at request
 * time, mirroring the real API's own join.
 *
 * "Oak Dining Chair" gets two real variants (a `Finish` option, one in
 * stock/default, one out of stock) — same pairing PR7's own local
 * storefront projection used, now backed by real shared option-value ids
 * instead of an inline literal.
 */
export interface VariantRecord {
	id: string;
	productId: string;
	code: string | null;
	altCode: string | null;
	price: number;
	stock: number;
	stockMin: number;
	isDefault: boolean;
	isActive: boolean;
	displayOrder: number;
	optionValueIds: string[];
	createdAt: string;
	updatedAt: string;
}

const NOW = "2026-09-01T00:00:00.000Z";

export function defaultVariantSeed(): VariantRecord[] {
	return [
		{
			id: "00000000-0000-4000-8000-000000000011",
			productId: "00000000-0000-4000-8000-000000000001",
			code: "CHR-001-NAT",
			altCode: null,
			price: 129.99,
			stock: 12,
			stockMin: 2,
			isDefault: true,
			isActive: true,
			displayOrder: 0,
			optionValueIds: [NATURAL_VALUE_ID],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: "00000000-0000-4000-8000-000000000012",
			productId: "00000000-0000-4000-8000-000000000001",
			code: "CHR-001-WAL",
			altCode: null,
			price: 149.99,
			stock: 0,
			stockMin: 2,
			isDefault: false,
			isActive: true,
			displayOrder: 1,
			optionValueIds: [WALNUT_VALUE_ID],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: "00000000-0000-4000-8000-000000000021",
			productId: "00000000-0000-4000-8000-000000000002",
			code: "SOF-002",
			altCode: null,
			price: 899.0,
			stock: 4,
			stockMin: 1,
			isDefault: true,
			isActive: true,
			displayOrder: 0,
			optionValueIds: [],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: "00000000-0000-4000-8000-000000000031",
			productId: "00000000-0000-4000-8000-000000000003",
			code: "LMP-003",
			altCode: null,
			price: 219.5,
			stock: 0,
			stockMin: 2,
			isDefault: true,
			isActive: true,
			displayOrder: 0,
			optionValueIds: [],
			createdAt: NOW,
			updatedAt: NOW,
		},
		// "Modular Bookshelf" — `Finish` × `Size`, THREE of the four possible
		// combinations exist (Natural/Small, Natural/Large, Walnut/Small).
		// Walnut/Large deliberately does NOT exist — bug fix regression
		// fixture (`sdd/ecommerce-product-variants/apply-progress` PR11).
		{
			id: "00000000-0000-4000-8000-000000000041",
			productId: "00000000-0000-4000-8000-000000000004",
			code: "SHF-004-NAT-S",
			altCode: null,
			price: 89.99,
			stock: 15,
			stockMin: 2,
			isDefault: true,
			isActive: true,
			displayOrder: 0,
			optionValueIds: [NATURAL_VALUE_ID, SMALL_VALUE_ID],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: "00000000-0000-4000-8000-000000000042",
			productId: "00000000-0000-4000-8000-000000000004",
			code: "SHF-004-NAT-L",
			altCode: null,
			price: 119.99,
			stock: 8,
			stockMin: 2,
			isDefault: false,
			isActive: true,
			displayOrder: 1,
			optionValueIds: [NATURAL_VALUE_ID, LARGE_VALUE_ID],
			createdAt: NOW,
			updatedAt: NOW,
		},
		{
			id: "00000000-0000-4000-8000-000000000043",
			productId: "00000000-0000-4000-8000-000000000004",
			code: "SHF-004-WAL-S",
			altCode: null,
			price: 94.99,
			stock: 6,
			stockMin: 2,
			isDefault: false,
			isActive: true,
			displayOrder: 2,
			optionValueIds: [WALNUT_VALUE_ID, SMALL_VALUE_ID],
			createdAt: NOW,
			updatedAt: NOW,
		},
	];
}

export const variantsFixture: VariantRecord[] = defaultVariantSeed();
