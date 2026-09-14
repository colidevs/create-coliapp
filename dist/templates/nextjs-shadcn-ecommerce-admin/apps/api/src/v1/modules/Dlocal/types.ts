import { z } from "zod";

/**
 * @description `dlocal-checkout` domain (`sdd/ecommerce-admin-template`).
 * Item shape a checkout request carries — `productId` (not `slug`, unlike
 * munod's `CheckoutItemSchema`) since this template's `products` table
 * (`src/lib/db/schema.ts`) is the join key `priceAndValidateItems` reads
 * against directly.
 */
export const CheckoutItemSchema = z.object({
	productId: z.uuid().meta({ example: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c" }),
	quantity: z.number().int().positive().meta({ example: 2 }),
});
export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;

export const CheckoutPayerSchema = z.object({
	name: z.string().meta({ example: "Jane Doe" }),
	email: z.email().meta({ example: "jane@example.com" }),
	document: z.string().meta({ example: "12345678" }),
	phone: z.string().optional().meta({ example: "+1 555 0100" }),
});
export type CheckoutPayer = z.infer<typeof CheckoutPayerSchema>;

/**
 * @description Request body for `POST /api/v1/dlocal/checkout`.
 * `orderId` is a CLIENT-supplied idempotency key, not server-generated —
 * ported verbatim as a design choice from munod's real `CreateCheckoutSchema`
 * (`munod/api/src/v1/modules/Dlocal/types.ts:28-39`), since the idempotent
 * "check for an existing order before calling dLocal" replay path
 * (`./repository.ts`) depends on the caller reusing the same `orderId` across
 * a retried request.
 *
 * Deliberately DROPS munod's per-request `currency`/`country`/`success_url`/
 * `back_url`/`notification_url`/`description` fields — this template elevates
 * all of those to configurable env vars (`src/config.ts`'s `config.dlocal.*`,
 * see that file's own comment) as a documented template-quality improvement,
 * not a restatement of munod's current per-request shape.
 */
export const CheckoutRequestSchema = z
	.object({
		orderId: z.string().min(1).meta({ example: "order-2026-000123" }),
		payer: CheckoutPayerSchema.optional(),
		items: z.array(CheckoutItemSchema).min(1),
	})
	.meta({
		id: "CheckoutRequest",
		description:
			"Creates a dLocal Go checkout session tied to a persisted order. Replaying the same orderId returns the existing session instead of creating a duplicate.",
		example: {
			orderId: "order-2026-000123",
			payer: {
				name: "Jane Doe",
				email: "jane@example.com",
				document: "12345678",
			},
			items: [
				{
					productId: "9c4f3e1a-3b7e-4b1a-9c7a-4d3b6e2f8a1c",
					quantity: 2,
				},
			],
		},
	});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z
	.object({
		orderId: z.string().meta({ example: "order-2026-000123" }),
		dlocalId: z.string().meta({ example: "D-4-e836ba0b-1f9b-4a3e" }),
		status: z.string().meta({ example: "PENDING" }),
		redirectUrl: z
			.url()
			.meta({ example: "https://checkout.dlocalgo.com/pay/D-4-e836ba0b" }),
	})
	.meta({
		id: "CheckoutResponse",
		description:
			"The created (or replayed) dLocal checkout session, including the redirect URL the storefront sends the buyer to.",
	});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

/**
 * @description Request body for `POST /api/v1/dlocal/notifications` — dLocal
 * Go's own webhook payload shape, verified against
 * `munod/api/src/v1/modules/Dlocal/types.ts:85-88`. Kept in dLocal's own
 * `payment_id` (snake_case) field naming — this is the third party's wire
 * format, not this app's own JSON convention.
 */
export const DlocalNotificationSchema = z
	.object({
		payment_id: z.string().meta({ example: "D-4-e836ba0b-1f9b-4a3e" }),
	})
	.meta({
		id: "DlocalNotification",
		description: "dLocal Go's payment-notification webhook payload.",
	});
export type DlocalNotification = z.infer<typeof DlocalNotificationSchema>;

// --- Internal — dLocal's own API response shapes ---------------------------
// Not part of THIS app's public OpenAPI contract (task 3.6 registers only
// the three schemas above), so no `.meta()`/`generate-openapi.ts` wiring.

export const DlocalCheckoutApiResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
	redirect_url: z.string(),
});
export type DlocalCheckoutApiResponse = z.infer<
	typeof DlocalCheckoutApiResponseSchema
>;

export const DlocalPaymentApiResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
	redirect_url: z.string(),
});
export type DlocalPaymentApiResponse = z.infer<
	typeof DlocalPaymentApiResponseSchema
>;

/** @description A checkout item after price/stock validation against `products`. */
export interface PricedOrderItem {
	productId: string;
	slug: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

/** @description `orders` row shape, camelCased from `src/lib/db/schema.ts`. */
export interface Order {
	id: string;
	orderId: string;
	dlocalId: string | null;
	status: string;
	buyerProducts: PricedOrderItem[];
}
