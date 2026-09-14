import { Image as ImageIcon } from "lucide-react";

import { ProductImagesProviderClient } from "./context";
import { ProductImagesTable } from "./table";
import type { ListProductImagesParams } from "./types";

export function ProductImagesPage({
	filters,
}: {
	// Explicit `| undefined` (ADR 0030's `exactOptionalPropertyTypes` floor)
	// — the caller (`app/(adm)/admin/product-images/page.tsx`) derives this
	// from `await searchParams`, which is genuinely `T | undefined`, not
	// merely omittable.
	filters?: ListProductImagesParams | undefined;
}) {
	return (
		<ProductImagesProviderClient>
			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<ImageIcon className="size-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-semibold">Product images</h1>
						<p className="text-muted-foreground text-sm">
							Manage each product's gallery images.
						</p>
					</div>
				</header>
				<ProductImagesTable {...(filters ? { filters } : {})} />
			</section>
		</ProductImagesProviderClient>
	);
}
