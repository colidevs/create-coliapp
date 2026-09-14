"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createDlocalCheckout } from "@/generated/endpoints";
import type { CheckoutRequest, CheckoutRequestPayer } from "@/generated/model";
import { LAST_CHECKOUT_COOKIE } from "./cookie";

/**
 * RETARGETED (`sdd/ecommerce-product-variants/design`, Phase 7): a checkout
 * line item now cites the specific `variantId` the buyer resolved, matching
 * `CheckoutRequestItemsItem`'s own retargeted field (PR6,
 * `apps/api`'s `Dlocal/types.ts`).
 */
export interface CheckoutCartItem {
	variantId: string;
	quantity: number;
}

export interface CheckoutActionResult {
	error?: string;
}

/**
 * Why a cookie (`./cookie.ts`'s `LAST_CHECKOUT_COOKIE`), and not a query
 * param on the return page: this template's `apps/api` (design decision,
 * `sdd/ecommerce-admin-template/design`) elevated dLocal's `success_url`/
 * `back_url`/`notification_url` from per-request fields to fixed env vars —
 * there is no `{ORDER_ID}`-style macro dLocal expands on redirect back
 * (unlike, say, Stripe's `session_id={CHECKOUT_SESSION_ID}`), so the
 * storefront cannot rely on the URL dLocal redirects to for the
 * order/payment identity. And there is no PUBLIC order-status endpoint to
 * query on that page either — `admin/orders` is deliberately CASL-gated
 * admin-only (buyer-PII asymmetry, PR4's own documented design decision) —
 * adding one would be an `apps/api` change, out of scope for this
 * apps/web-only storefront port. The cookie is the one piece of state that
 * survives the round-trip through dLocal's own domain and back, carrying the
 * `CheckoutResponse` known at checkout-submission time. Named limitation:
 * the return page shows the status AS OF CHECKOUT, not the final,
 * webhook-driven status transition — see that page's own doc comment.
 */

/**
 * Called directly (not via `<form action>`/`useActionState`) from
 * `checkout/page.tsx`'s React Hook Form `onSubmit` — a plain RPC-style
 * Server Action invocation, which Next.js supports identically to the form-
 * bound case. Builds the real `CheckoutRequest` this template's `apps/api`
 * `dlocal-checkout` domain expects (PR3a) and hands the buyer off to the
 * returned `redirectUrl`.
 */
export async function submitCheckout(
	payer: CheckoutRequestPayer,
	items: CheckoutCartItem[],
): Promise<CheckoutActionResult> {
	if (items.length === 0) {
		return { error: "Your cart is empty." };
	}

	const request: CheckoutRequest = {
		orderId: crypto.randomUUID(),
		payer,
		items,
	};

	const result = await createDlocalCheckout(request);

	if (result.status !== 200) {
		return { error: result.data.detail ?? result.data.title };
	}

	const cookieStore = await cookies();
	cookieStore.set(
		LAST_CHECKOUT_COOKIE,
		JSON.stringify({
			orderId: result.data.orderId,
			dlocalId: result.data.dlocalId,
			status: result.data.status,
		}),
		{
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60,
		},
	);

	redirect(result.data.redirectUrl);
}
