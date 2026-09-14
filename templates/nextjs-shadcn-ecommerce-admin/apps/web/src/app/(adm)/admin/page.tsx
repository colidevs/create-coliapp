import { Boxes, Image as ImageIcon, Shapes } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardTitle } from "@/components/ui/card";

/**
 * ADAPTED, not a port of munod's real `admin/page.tsx` — that dashboard
 * reads live stock/newsletter-subscription metrics this template's schema
 * doesn't have (design decision A4). This is a minimal index page linking
 * to each admin entity, matching the design's own directory tree
 * (`(adm)/admin/page.tsx`).
 */
const ENTITIES = [
	{ title: "Products", href: "/admin/products", icon: Boxes },
	{ title: "Categories", href: "/admin/categories", icon: Shapes },
	{ title: "Product Images", href: "/admin/product-images", icon: ImageIcon },
] as const;

export default function AdminPage() {
	return (
		<section className="space-y-6">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold">Admin</h1>
				<p className="text-muted-foreground text-sm">
					Manage your catalog — products, categories, and product images.
				</p>
			</header>
			<div className="flex flex-wrap gap-4">
				{ENTITIES.map((entity) => (
					<Link key={entity.href} href={entity.href}>
						<Card className="w-48 items-center justify-center gap-2 py-8 shadow-none hover:bg-muted/50">
							<entity.icon className="size-6 text-muted-foreground" />
							<CardContent className="p-0">
								<CardTitle className="text-base font-normal">
									{entity.title}
								</CardTitle>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</section>
	);
}
