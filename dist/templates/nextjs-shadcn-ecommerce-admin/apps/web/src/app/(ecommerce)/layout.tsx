import { QueryProvider } from "@/components/providers/query-provider";
import { listPublicCategories } from "@/generated/endpoints";
import type { Category } from "@/generated/model";
import { EcommerceShell } from "./shell";

/**
 * Ported (structurally) from munod's real `app/(ecommerce)/layout.tsx` —
 * same shape (fetch categories server-side, hand them to the shell), but
 * this template has no `modules/categories/actions.ts` (a client-facing
 * server-action module Phase 7's admin port owns, not this storefront-only
 * phase) — the storefront's own category-nav read is a single, direct,
 * non-revalidating Server Component fetch of the generated `listPublicCategories`
 * client function, which is the correct call per ADR 0021: a one-off,
 * render-time-only read has no need for `getQueryClient()`/TanStack Query at
 * all (that pattern is reserved for data a Client Component also needs to
 * read/refetch — see `products/page.tsx`).
 *
 * `force-dynamic`: every route under this layout reads live catalog/cart
 * data (this layout's own categories fetch, `page.tsx`/`products/page.tsx`'s
 * prefetched queries, `checkout/return/page.tsx`'s cookie read) — none of it
 * is meaningfully static-prerenderable at `next build` time, and a static
 * attempt would try to reach `apps/api` (or MSW) at build time, when neither
 * is running. This is ADR 0024's "explicit, narrowly-scoped opt-in" applied
 * at exactly this route-group boundary, not a blanket static-by-default
 * violation.
 */
export const dynamic = "force-dynamic";

export default async function EcommerceRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// A categories-fetch failure should not 500 the entire storefront shell —
	// the header degrades to "All products" only, rather than the whole
	// route group becoming unreachable.
	const categories: Category[] = await listPublicCategories()
		.then((result) => (result.status === 200 ? result.data : []))
		.catch(() => []);

	return (
		<QueryProvider>
			<EcommerceShell categories={categories}>{children}</EcommerceShell>
		</QueryProvider>
	);
}
