"use client";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import type { Category } from "@/generated/model";
import { CartDrawerProvider } from "@/modules/cart/context";
import { CartDrawer } from "@/modules/cart/drawer";

/**
 * Storefront shell — deliberately NOT a port of munod's real
 * `app/(ecommerce)/shell.tsx` (`EcommerceShell`). That file wraps its
 * children in a `SlidePanel`-driven mega-menu sidebar (`app-sidebar.tsx`'s
 * `AppSidebar`/`ProductSidebar`), a `zoom-context`-powered "drag to explore"
 * viewer (`ZoomProvider`/`ZoomContainer`), and a `NewsletterDialog` —  all
 * furniture-shop-specific interaction design (megamenu subcategories
 * mirroring munod's own furniture taxonomy, zoomable product photography)
 * with no counterpart in this template's generic, actual public API
 * contract (`Product`/`Category` — no gallery images, no dimensional
 * metadata to zoom into). Task 6.1's own precedent (dropping
 * `design/faq/us/newsletter` routes as munod-domain-specific) extends here:
 * this shell keeps only the generically-reusable pieces — a header, a cart
 * drawer, a footer — and skips the bespoke chrome entirely, matching the
 * design's own directory tree (`layout.tsx`/`shell.tsx`/`page.tsx` only, no
 * `app-sidebar.tsx`/`zoom-container.tsx`/`slide-panel.tsx`).
 */
export function EcommerceShell({
	children,
	categories,
}: {
	children: React.ReactNode;
	categories: Category[];
}) {
	return (
		<CartDrawerProvider>
			<CartDrawer />
			<div className="flex min-h-screen flex-col">
				<Header categories={categories} />
				<main className="flex-1">{children}</main>
				<Footer />
			</div>
		</CartDrawerProvider>
	);
}
