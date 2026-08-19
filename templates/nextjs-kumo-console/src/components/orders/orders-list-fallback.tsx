import { SkeletonLine } from "@cloudflare/kumo";

/**
 * `<Suspense>` fallback for `orders/page.tsx`'s narrowly-scoped dynamic hole
 * (frontend-rendering-architecture.md). A flat, single-export component with
 * only serializable (no) props — safe to render directly from the Server
 * Component page, no `"use client"` leaf needed (console-ui-kumo.md /
 * frontend-technical-conventions.md's RSC client-boundary rule).
 */
export function OrdersListFallback() {
	return (
		<div className="flex flex-col gap-3">
			<SkeletonLine />
			<SkeletonLine />
			<SkeletonLine />
		</div>
	);
}
