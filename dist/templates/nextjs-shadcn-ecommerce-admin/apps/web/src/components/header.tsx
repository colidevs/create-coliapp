"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import type { Category } from "@/generated/model";
import { useCartDrawer } from "@/modules/cart/context";
import { useCartStore } from "@/modules/cart/store";

/**
 * Simplified storefront header — adapted, not a literal port. Munod's real
 * `components/header.tsx` (`HomeHeader`) is built around furniture-shop-only
 * chrome this template's `shell.tsx` deliberately does not port (the
 * `SlidePanel`-based mega-menu sidebar, `zoom-context`'s "drag to explore"
 * viewer, `NewsletterDialog`, `SearchDialog`) — see `shell.tsx`'s own doc
 * comment for the full reasoning. This header keeps only the genuinely
 * generic pieces: a home link, a simple category nav, and the cart trigger
 * (munod's own cart-icon-with-badge, inlined here rather than in a mega-menu
 * shell).
 */
export function Header({ categories }: { categories: Category[] }) {
	const { setOpen } = useCartDrawer();
	const { items } = useCartStore();

	const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

	return (
		<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
				<Link href="/" className="font-semibold text-lg">
					{siteConfig.name}
				</Link>

				<nav className="hidden items-center gap-4 text-sm md:flex">
					<Link href="/products" className="hover:underline">
						All products
					</Link>
					{categories.map((category) => (
						<Link
							key={category.id}
							href={`/products?categoryId=${category.id}`}
							className="hover:underline"
						>
							{category.name}
						</Link>
					))}
				</nav>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="relative"
					onClick={() => setOpen(true)}
					aria-label="Open cart"
				>
					<ShoppingBag className="size-5" />
					{totalItems > 0 ? (
						<span className="-right-1 -top-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
							{totalItems}
						</span>
					) : null}
				</Button>
			</div>
		</header>
	);
}
