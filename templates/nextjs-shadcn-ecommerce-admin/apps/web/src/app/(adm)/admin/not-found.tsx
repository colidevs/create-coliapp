import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Admin-scoped `not-found` boundary — found live by Thomas testing a pilot:
 * navigating to a nonexistent admin record (e.g. `/admin/products/[id]` with
 * a bad id calling `notFound()`) fell through to the root `app/not-found.tsx`
 * (storefront-styled, `(ecommerce)`-shell copy, added for the storefront's
 * own 404 gap) because no admin-scoped `not-found.tsx` existed — the
 * resulting page dropped the admin sidebar entirely and offered a "Back to
 * shop" CTA, making a 404 inside the admin look like it had kicked the user
 * out into the storefront. Placed inside `(adm)/admin/` so Next nests it
 * under `AdminRootLayout` — the sidebar and auth/ability context come for
 * free from that layout, no manual re-wiring needed.
 */
export default function AdminNotFound() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
			<h1 className="font-semibold text-3xl">Not found</h1>
			<p className="max-w-md text-muted-foreground">
				The record you're looking for doesn't exist or may have been removed.
			</p>
			<Button asChild>
				<Link href="/admin">Back to admin</Link>
			</Button>
		</div>
	);
}
