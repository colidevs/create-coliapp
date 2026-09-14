/**
 * In-memory `orders` MSW fixture, matching this template's ACTUAL generated
 * `OrderOutput` shape (`@/generated/model`). Read-only in the real API
 * (`admin/orders` has no create/update/delete route at all — see
 * `apps/api/src/v1/modules/admin/orders/route.ts`), so this fixture is never
 * mutated by `src/mocks/handlers/admin.ts` — status only ever changes via
 * the (separately mocked, `handlers/storefront.ts`) dLocal webhook flow in a
 * real deployment.
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
		productId: string;
		slug: string;
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
					productId: "prod-oak-chair",
					slug: "oak-dining-chair",
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
					productId: "prod-velvet-sofa",
					slug: "velvet-sofa",
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
