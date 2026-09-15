/**
 * In-memory `orders` MSW fixture, matching this template's ACTUAL generated
 * `OrderOutput` shape (`@/generated/model`). Read-only in the real API
 * (`admin/orders` has no create/update/delete route at all — see
 * `apps/api/src/v1/modules/admin/orders/route.ts`), so this fixture is never
 * mutated by `src/mocks/handlers/admin.ts` — status only ever changes via
 * the (separately mocked, `handlers/storefront.ts`) dLocal webhook flow in a
 * real deployment.
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, tasks item 9.5)**:
 * `buyerProducts` items are keyed by `variantId` (was `productId`), with a
 * `variantLabel`, matching `OrderItemSchema`'s own retarget in the same PR.
 */
export interface OrderRecord {
	id: string;
	orderId: string;
	mail: string | null;
	buyerInfo: {
		name: string;
		email: string;
		document: string;
		phone?: string;
	} | null;
	dlocalId: string | null;
	buyerProducts: Array<{
		variantId: string;
		slug: string;
		variantLabel: string | null;
		quantity: number;
		unitPrice: number;
		lineTotal: number;
	}>;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export function defaultOrderSeed(): OrderRecord[] {
	const now = "2026-09-01T00:00:00.000Z";

	return [
		{
			id: "order-e2e-001",
			orderId: "order-2026-000123",
			mail: "jane@example.com",
			buyerInfo: {
				name: "Jane Doe",
				email: "jane@example.com",
				document: "12345678",
			},
			dlocalId: "D-4-mock-order-2026-000123",
			buyerProducts: [
				{
					variantId: "00000000-0000-4000-8000-000000000011",
					slug: "oak-dining-chair",
					variantLabel: "Natural",
					quantity: 2,
					unitPrice: 129.99,
					lineTotal: 259.98,
				},
			],
			status: "PAID",
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "order-e2e-002",
			orderId: "order-2026-000124",
			mail: "john@example.com",
			buyerInfo: {
				name: "John Roe",
				email: "john@example.com",
				document: "87654321",
			},
			dlocalId: "D-4-mock-order-2026-000124",
			buyerProducts: [
				{
					variantId: "00000000-0000-4000-8000-000000000021",
					slug: "velvet-sofa",
					variantLabel: null,
					quantity: 1,
					unitPrice: 899.0,
					lineTotal: 899.0,
				},
			],
			status: "PENDING",
			createdAt: now,
			updatedAt: now,
		},
	];
}

export const ordersFixture: OrderRecord[] = defaultOrderSeed();
