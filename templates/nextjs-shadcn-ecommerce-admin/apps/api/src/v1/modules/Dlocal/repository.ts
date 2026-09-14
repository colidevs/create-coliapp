import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { config } from "@/config";
import { schema, type Tx, withPlatformSession } from "@/lib/db";
import { err } from "@/lib/logger";
import {
	InsufficientStockHttpError,
	InternalServerError,
	NotFoundHttpError,
	PaymentProviderHttpError,
} from "@/v1/res/errors";
import type {
	CheckoutItem,
	DlocalCheckoutApiResponse,
	DlocalPaymentApiResponse,
	Order,
	PricedOrderItem,
} from "./types";
import {
	DlocalCheckoutApiResponseSchema,
	DlocalPaymentApiResponseSchema,
} from "./types";

const { orders, products } = schema;

/**
 * @description dLocal Go's real, documented payment-status vocabulary for
 * this template's scope (checkout + a single terminal-status webhook, no
 * separate authorization/refund flow) — verified against munod's own live
 * production usage (`munod/api/src/v1/modules/Dlocal/types.ts`'s
 * `DlocalPaymentStatusEnum`: `PENDING | PAID | REJECTED | CANCELLED |
 * EXPIRED`), not invented. `PAID` is terminal-success (handled below via
 * `decrementStock`); these three are the terminal-failure counterparts that
 * restore stock. `PENDING` is the only non-terminal status and never
 * triggers either branch.
 */
const TERMINAL_FAILURE_STATUSES = new Set(["REJECTED", "CANCELLED", "EXPIRED"]);

/**
 * @description The 4 new tables (`src/lib/db/schema.ts`) carry no
 * `tenant_id` column — this template targets a single-tenant-per-deployment
 * client project (design decision A1/A4). `withPlatformSession` (not
 * `withTenantSession`) is therefore the semantically-correct choice here, per
 * the note left in `sdd/ecommerce-admin-template/tasks` at the end of
 * Phase 2: the table's RLS policy is an unconditional `USING (true)`, so
 * `withTenantSession` would technically also work, but `withPlatformSession`
 * self-documents "no tenant dimension applies to this query" instead of
 * silently passing an unused tenant context.
 */

function toOrder(row: typeof orders.$inferSelect): Order {
	return {
		id: row.id,
		orderId: row.orderId,
		dlocalId: row.dlocalId,
		status: row.status,
		buyerProducts: row.buyerProducts as PricedOrderItem[],
	};
}

export interface Repository {
	priceAndValidateItems: (
		items: CheckoutItem[],
	) => Promise<{ orderItems: PricedOrderItem[]; amount: number }>;
	getOrderByOrderId: (orderId: string) => Promise<Order | null>;
	getOrderByDlocalId: (dlocalId: string) => Promise<Order | null>;
	createOrder: (input: {
		orderId: string;
		mail: string | null;
		buyerInfo: unknown;
		buyerProducts: PricedOrderItem[];
		dlocalId: string;
		status: string;
	}) => Promise<Order>;
	createDlocalCheckout: (input: {
		amount: number;
		orderId: string;
		payer?: unknown;
	}) => Promise<DlocalCheckoutApiResponse>;
	getPayment: (dlocalId: string) => Promise<DlocalPaymentApiResponse>;
	/**
	 * Atomically flips `status` only if it actually changed
	 * (`WHERE status <> newStatus`), and — inside that SAME transaction —
	 * atomically decrements stock when the new status is `"PAID"`, or
	 * restores it when the new status is a terminal-failure status
	 * (`TERMINAL_FAILURE_STATUSES`) AND the order's status immediately before
	 * this transition was `"PAID"` (i.e. its stock was actually decremented
	 * in the first place — see `restoreStock`'s own doc comment). Returns
	 * `transitioned: null` when the order was already at `status` (a
	 * duplicate/stale webhook delivery), matching munod's real
	 * `updateOrderStatusIfChanged`
	 * (`munod/api/src/v1/modules/Dlocal/repository.ts:319-345`) — closes the
	 * race between concurrent webhook deliveries for the same payment, and
	 * — since neither the decrement nor the restore branch below can run
	 * without a successful transition first — also closes the
	 * double-decrement/double-restore race for a repeated terminal-status
	 * webhook.
	 */
	applyPaymentTransition: (
		dlocalId: string,
		status: string,
	) => Promise<Order | null>;
}

function dlocalRepo(): Repository {
	async function priceAndValidateItems(
		items: CheckoutItem[],
	): ReturnType<Repository["priceAndValidateItems"]> {
		return withPlatformSession(async (tx) => {
			const ids = items.map((item) => item.productId);

			const rows = await tx
				.select({
					id: products.id,
					slug: products.slug,
					price: products.price,
					stock: products.stock,
					isActive: products.isActive,
				})
				.from(products)
				.where(inArray(products.id, ids));

			const orderItems: PricedOrderItem[] = [];
			let amount = 0;

			for (const item of items) {
				const product = rows.find((row) => row.id === item.productId);

				if (!product?.isActive) {
					throw new NotFoundHttpError(`Product ${item.productId} not found`);
				}

				const stockIsTracked = product.stock >= 0;

				if (stockIsTracked && product.stock < item.quantity) {
					throw new InsufficientStockHttpError(product.slug);
				}

				const unitPrice = Number(product.price);
				const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

				orderItems.push({
					productId: product.id,
					slug: product.slug,
					quantity: item.quantity,
					unitPrice,
					lineTotal,
				});

				amount += lineTotal;
			}

			return { orderItems, amount: Math.round(amount * 100) / 100 };
		});
	}

	async function getOrderByOrderId(
		orderId: string,
	): ReturnType<Repository["getOrderByOrderId"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(orders)
				.where(eq(orders.orderId, orderId));

			return row ? toOrder(row) : null;
		});
	}

	async function getOrderByDlocalId(
		dlocalId: string,
	): ReturnType<Repository["getOrderByDlocalId"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(orders)
				.where(eq(orders.dlocalId, dlocalId));

			return row ? toOrder(row) : null;
		});
	}

	async function createOrder(
		input: Parameters<Repository["createOrder"]>[0],
	): ReturnType<Repository["createOrder"]> {
		return withPlatformSession(async (tx) => {
			const [inserted] = await tx
				.insert(orders)
				.values({
					orderId: input.orderId,
					mail: input.mail,
					buyerInfo: input.buyerInfo,
					buyerProducts: input.buyerProducts,
					dlocalId: input.dlocalId,
					status: input.status,
				})
				.onConflictDoNothing({ target: orders.orderId })
				.returning();

			if (inserted) {
				return toOrder(inserted);
			}

			// Race: another request with the same client-supplied `orderId`
			// inserted first — matches munod's real Postgres `23505`-catch
			// replay pattern (`munod/api/.../Dlocal/repository.ts:190-196`),
			// detected here via `.onConflictDoNothing()`'s empty return rather
			// than a caught error code, since that's how Drizzle's Postgres
			// driver surfaces the conflict for this insert shape.
			const [existing] = await tx
				.select()
				.from(orders)
				.where(eq(orders.orderId, input.orderId));

			if (!existing) {
				throw new InternalServerError();
			}

			return toOrder(existing);
		});
	}

	async function createDlocalCheckout(
		input: Parameters<Repository["createDlocalCheckout"]>[0],
	): ReturnType<Repository["createDlocalCheckout"]> {
		const requestBody = {
			amount: input.amount,
			currency: config.dlocal.defaultCurrency,
			country: config.dlocal.defaultCountry,
			order_id: input.orderId,
			description: `Order ${input.orderId}`,
			success_url: config.dlocal.successUrl,
			back_url: config.dlocal.backUrl,
			notification_url: config.dlocal.notificationUrl,
			...(input.payer ? { payer: input.payer } : {}),
		};

		let response: Response;
		try {
			response = await fetch(config.dlocal.apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.dlocal.apiKey}:${config.dlocal.apiSecret}`,
				},
				body: JSON.stringify(requestBody),
			});
		} catch (e) {
			err("dLocal createCheckout network error:", e);
			throw new PaymentProviderHttpError();
		}

		if (!response.ok) {
			err(
				`dLocal createCheckout error: ${response.status} - ${await response.text()}`,
			);
			throw new PaymentProviderHttpError();
		}

		const result = await response.json();
		const parsed = DlocalCheckoutApiResponseSchema.safeParse(result);

		if (!parsed.success) {
			err(parsed.error);
			throw new PaymentProviderHttpError();
		}

		return parsed.data;
	}

	async function getPayment(
		dlocalId: string,
	): ReturnType<Repository["getPayment"]> {
		let response: Response;
		try {
			response = await fetch(`${config.dlocal.apiUrl}/${dlocalId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${config.dlocal.apiKey}:${config.dlocal.apiSecret}`,
				},
			});
		} catch (e) {
			err("dLocal getPayment network error:", e);
			throw new PaymentProviderHttpError();
		}

		if (!response.ok) {
			err(
				`dLocal getPayment error: ${response.status} - ${await response.text()}`,
			);
			throw new PaymentProviderHttpError();
		}

		const result = await response.json();
		const parsed = DlocalPaymentApiResponseSchema.safeParse(result);

		if (!parsed.success) {
			err(parsed.error);
			throw new PaymentProviderHttpError();
		}

		return parsed.data;
	}

	async function applyPaymentTransition(
		dlocalId: string,
		status: string,
	): ReturnType<Repository["applyPaymentTransition"]> {
		return withPlatformSession(async (tx) => {
			// Row-locked read of the order's CURRENT status, taken before the
			// guarded UPDATE below, purely to answer "did this order ever reach
			// PAID" (and therefore have its stock decremented) when
			// transitioning into a terminal-failure status — the UPDATE's own
			// `RETURNING` only ever exposes the post-transition row, never the
			// prior value. `FOR UPDATE` locks the row for the rest of this
			// transaction, so a concurrent webhook for the same `dlocalId`
			// cannot interleave between this read and the update below.
			const [existing] = await tx
				.select({ status: orders.status })
				.from(orders)
				.where(eq(orders.dlocalId, dlocalId))
				.for("update");

			const [row] = await tx
				.update(orders)
				.set({ status, updatedAt: new Date() })
				.where(and(eq(orders.dlocalId, dlocalId), ne(orders.status, status)))
				.returning();

			if (!row) {
				return null;
			}

			const order = toOrder(row);

			if (status === "PAID") {
				await decrementStock(tx, order.buyerProducts);
			} else if (
				TERMINAL_FAILURE_STATUSES.has(status) &&
				existing?.status === "PAID"
			) {
				// Only an order that actually reached PAID (and therefore had
				// its stock decremented) gets restored here — an order that
				// fails before ever reaching PAID (e.g. PENDING -> REJECTED
				// directly) never had its stock touched, so there is nothing to
				// restore. The `WHERE ... AND status <> newStatus` guard above
				// already makes this whole branch unreachable on a duplicate
				// webhook redelivery for the same terminal status (`row` is
				// `undefined` the second time around, so this code never
				// re-runs) — the same idempotency mechanism the `PAID` branch
				// above already relies on.
				await restoreStock(tx, order.buyerProducts);
			}

			return order;
		});
	}

	return {
		priceAndValidateItems,
		getOrderByOrderId,
		getOrderByDlocalId,
		createOrder,
		createDlocalCheckout,
		getPayment,
		applyPaymentTransition,
	};
}

/**
 * @description The atomic stock decrement (design decision (c),
 * `sdd/ecommerce-admin-template/design`) — ONE conditional
 * `UPDATE ... WHERE stock >= quantity RETURNING` per item, replacing munod's
 * non-atomic SELECT-then-`Math.max`-then-UPDATE
 * (`Dlocal/repository.ts:347-402`), one of the 5 gaps this whole change
 * exists to close. Runs inside the SAME transaction as the status
 * transition above (`applyPaymentTransition`) — `tx`, never a fresh session.
 *
 * Zero rows affected is ambiguous on its own: it means EITHER "insufficient
 * tracked stock" (must reject) OR "this product's stock is negative, i.e.
 * intentionally untracked inventory" (must silently no-op, matching munod's
 * own `continue` for the same case, `Dlocal/repository.ts:366`). The extra
 * read below exists only to disambiguate those two cases — it never
 * re-attempts the decrement itself, so it does not reopen the race the
 * atomic UPDATE above already closed.
 */
export async function decrementStock(
	tx: Tx,
	items: PricedOrderItem[],
): Promise<void> {
	for (const item of items) {
		const [row] = await tx
			.update(products)
			.set({ stock: sql`${products.stock} - ${item.quantity}` })
			.where(
				and(
					eq(products.id, item.productId),
					gte(products.stock, item.quantity),
				),
			)
			.returning({ id: products.id, stock: products.stock });

		if (row) {
			continue;
		}

		const [current] = await tx
			.select({ stock: products.stock })
			.from(products)
			.where(eq(products.id, item.productId));

		if (current && current.stock >= 0) {
			throw new InsufficientStockHttpError(item.slug);
		}

		// `current.stock < 0` (untracked) or the product no longer exists —
		// intentional no-op, matches munod's own untracked-inventory branch.
	}
}

/**
 * @description The atomic stock restore — the mirror-image counterpart to
 * `decrementStock` above, closing the previously-unimplemented "Atomic
 * restore" requirement (`sdd/ecommerce-admin-template/spec`,
 * stock-management domain, "Cancelled order restores stock"). ONE
 * conditional `UPDATE ... WHERE stock >= 0 RETURNING` per item, run inside
 * the SAME transaction as the status transition above
 * (`applyPaymentTransition`) — `tx`, never a fresh session.
 *
 * The `stock >= 0` guard mirrors `decrementStock`'s own untracked-inventory
 * convention: a negative `stock` value is this module's sentinel for
 * "intentionally untracked inventory". Restoring without this guard would
 * incorrectly move an untracked product's sentinel value toward zero,
 * silently making it look tracked. A product already at `stock >= 0` simply
 * gets its reserved quantity added back — there is no analogous "would go
 * negative" failure mode for an increment, so no
 * `InsufficientStockHttpError` branch is needed here, unlike
 * `decrementStock`.
 */
export async function restoreStock(
	tx: Tx,
	items: PricedOrderItem[],
): Promise<void> {
	for (const item of items) {
		await tx
			.update(products)
			.set({ stock: sql`${products.stock} + ${item.quantity}` })
			.where(and(eq(products.id, item.productId), gte(products.stock, 0)));
	}
}

export { dlocalRepo as createDlocalRepository };
