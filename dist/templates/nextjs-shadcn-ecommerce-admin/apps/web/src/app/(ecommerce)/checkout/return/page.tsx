import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LAST_CHECKOUT_COOKIE, type LastCheckout } from "../cookie";
import { ClearCartOnReturn } from "./clear-cart";

export const metadata: Metadata = {
	title: "Order status",
};

/**
 * NEW page — no munod precedent exists for this route (munod's own
 * checkout flow is a fake card form with no real dLocal redirect at all, see
 * `../page.tsx`'s doc comment; it has nothing resembling a `success_url`/
 * `back_url` landing page).
 *
 * `DLOCAL_SUCCESS_URL`/`DLOCAL_BACK_URL` (`apps/api/src/config.ts`) both
 * point at this one route — dLocal does not distinguish the two beyond
 * which fixed URL it redirects to, and neither carries a reliable
 * order-identifying query param (see `../actions.ts`'s doc comment). The
 * `last_checkout` cookie that Server Action set right before redirecting the
 * buyer to dLocal is the only signal this page can read.
 *
 * Named limitation (flagged, not silent): this reflects the order's status
 * AS OF CHECKOUT SUBMISSION, not any later webhook-driven transition
 * (`apps/api`'s `Dlocal/service.ts#handleNotification`) — there is no public
 * order-status endpoint to re-check against (`admin/orders` is CASL-gated,
 * admin-only). Adding one is an `apps/api` change, out of scope for this
 * apps/web-only storefront PR.
 */
export default async function CheckoutReturnPage() {
	const cookieStore = await cookies();
	const raw = cookieStore.get(LAST_CHECKOUT_COOKIE)?.value;

	const lastCheckout: LastCheckout | null = raw ? safeParse(raw) : null;

	return (
		<div className="mx-auto max-w-md px-4 py-24 text-center">
			<ClearCartOnReturn />
			{lastCheckout ? (
				<>
					<CheckCircle2 className="mx-auto size-12 text-primary" />
					<h1 className="mt-4 font-semibold text-2xl">
						Order {lastCheckout.orderId}
					</h1>
					<p className="mt-2 text-muted-foreground">
						Status at checkout: <strong>{lastCheckout.status}</strong>
					</p>
					<p className="mt-1 text-muted-foreground text-xs">
						Final confirmation is sent by email once the payment provider
						notifies us — this page reflects the status as of checkout, not a
						live re-check.
					</p>
				</>
			) : (
				<>
					<XCircle className="mx-auto size-12 text-muted-foreground" />
					<h1 className="mt-4 font-semibold text-2xl">No recent order</h1>
					<p className="mt-2 text-muted-foreground">
						We couldn't find a recent checkout for this browser session.
					</p>
				</>
			)}
			<Button asChild className="mt-8">
				<Link href="/products">Continue shopping</Link>
			</Button>
		</div>
	);
}

function safeParse(raw: string): LastCheckout | null {
	try {
		return JSON.parse(raw) as LastCheckout;
	} catch {
		return null;
	}
}
