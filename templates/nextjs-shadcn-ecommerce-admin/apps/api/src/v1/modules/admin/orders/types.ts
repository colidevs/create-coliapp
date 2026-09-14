import { z } from "zod";
import { PaginationSchema } from "@/v1/types";

/**
 * @description `admin-catalog-crud` domain, "Order administration" requirement
 * (Phase 4, `sdd/ecommerce-admin-template/spec`). Reads the SAME `orders`
 * table `dlocal-checkout`'s `Dlocal` module (Phase 3a) already writes
 * (`src/lib/db/schema.ts`) — this module is read-only, no create/update/
 * delete endpoint exists here at all: orders come into existence exclusively
 * through the checkout flow, and their `status` transitions exclusively
 * through the payment-notification webhook (`Dlocal/repository.ts#applyPaymentTransition`).
 * Unregistered, inline nested schema — not one of this Phase's `.meta()`
 * top-level components — mirroring `Dlocal/types.ts`'s own
 * `PricedOrderItem` interface as a Zod shape instead of importing it, to
 * keep this module's OpenAPI-facing contract self-contained rather than
 * cross-importing from the `dlocal-checkout` domain.
 */
export const OrderItemSchema = z.object({
	productId: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
	slug: z.string().meta({ example: "wireless-mouse" }),
	quantity: z.number().int().meta({ example: 2 }),
	unitPrice: z.number().meta({ example: 29.99 }),
	lineTotal: z.number().meta({ example: 59.98 }),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * @description Mirrors `Dlocal/types.ts`'s own `CheckoutPayerSchema` shape
 * (same 4 fields) — duplicated rather than imported for the same
 * self-contained-module reasoning as `OrderItemSchema` above. `orders.mail`/
 * `orders.buyer_info` (`src/lib/db/schema.ts`) are populated exclusively
 * from an already-validated `CheckoutPayerSchema` at checkout time
 * (`Dlocal/service.ts`), so reusing the same field-level validators here is
 * safe under `express-openapi-validator`'s `validateResponses: true`.
 */
export const OrderBuyerInfoSchema = z.object({
	name: z.string().meta({ example: "Jane Doe" }),
	email: z.email().meta({ example: "jane@example.com" }),
	document: z.string().meta({ example: "12345678" }),
	phone: z.string().optional().meta({ example: "+1 555 0100" }),
});
export type OrderBuyerInfo = z.infer<typeof OrderBuyerInfoSchema>;

/**
 * @description Column set matches `src/lib/db/schema.ts`'s `orders` table
 * exactly (`orderId`→`order_id`, `buyerInfo`→`buyer_info`,
 * `dlocalId`→`dlocal_id`, `buyerProducts`→`buyer_products`). `mail`/
 * `buyerInfo`/`dlocalId` are all nullable — a checkout request may omit
 * `payer` entirely (`Dlocal/types.ts`'s `CheckoutRequestSchema`), and
 * `dlocalId` is only set once the dLocal Go checkout call itself succeeds
 * (`Dlocal/repository.ts#createOrder`).
 */
export const OrderSchema = z
	.object({
		id: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
		orderId: z.string().meta({ example: "order-2026-000123" }),
		mail: z.email().nullable().meta({ example: "jane@example.com" }),
		buyerInfo: OrderBuyerInfoSchema.nullable(),
		dlocalId: z.string().nullable().meta({ example: "D-4-e836ba0b-1f9b-4a3e" }),
		buyerProducts: z.array(OrderItemSchema),
		status: z.string().meta({ example: "PAID" }),
		createdAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:00:00Z" }),
		updatedAt: z.iso
			.datetime({ offset: true })
			.meta({ example: "2026-01-01T00:05:00Z" }),
	})
	.meta({
		id: "Order",
		description:
			"An order created via the dLocal checkout flow. Read-only here — status transitions exclusively through the dLocal payment-notification webhook.",
	});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListSchema = z
	.object({
		items: z.array(OrderSchema),
		pagination: PaginationSchema,
	})
	.meta({
		id: "OrderList",
		description: "A page of orders.",
	});
export type OrderList = z.infer<typeof OrderListSchema>;

export interface GetOrdersParams {
	page?: number;
	size?: number;
	status?: string;
}
