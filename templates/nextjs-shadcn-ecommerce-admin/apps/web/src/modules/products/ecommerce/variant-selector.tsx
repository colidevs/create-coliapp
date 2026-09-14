"use client";

import { useState } from "react";

import { AddToCartButton } from "@/components/cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Price } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/modules/products/types";
import {
	groupVariantOptions,
	initialSelectedOptions,
	resolveDefaultVariant,
	resolveVariant,
	type SelectedVariantOptions,
} from "./variant-selection";

/**
 * `"use client"` leaf (`sdd/ecommerce-product-variants/design`, Phase 7) — a
 * buyer picks one value per option-type group (color/size/…) and the
 * component resolves the matching variant via `resolveVariant`'s every/some
 * predicate, showing that variant's price/stock and passing it to
 * `AddToCartButton`. Zero option groups (a single-variant product with no
 * option-value selections) renders no picker UI at all — just the resolved
 * (only) variant's price/stock, matching a plain non-variant product's prior
 * look.
 */
export function VariantSelector({ product }: { product: PublicProduct }) {
	const { variants } = product;
	const defaultVariant = resolveDefaultVariant(product);
	const groups = groupVariantOptions(variants);

	const [selected, setSelected] = useState<SelectedVariantOptions>(() =>
		initialSelectedOptions(defaultVariant),
	);

	const resolved = resolveVariant(variants, selected, defaultVariant);

	return (
		<div className="space-y-6">
			{groups.length > 0 ? (
				<div className="space-y-4">
					{groups.map((group) => (
						<div key={group.optionTypeSlug} className="space-y-2">
							<span className="font-medium text-sm">
								{group.optionTypeName}
							</span>
							<div className="flex flex-wrap gap-2">
								{group.values.map((value) => {
									const isSelected =
										selected[group.optionTypeSlug] === value.valueSlug;
									return (
										<Button
											key={value.valueSlug}
											type="button"
											variant={isSelected ? "default" : "outline"}
											size="sm"
											className={cn(
												"rounded-none",
												isSelected && "font-semibold",
											)}
											aria-pressed={isSelected}
											onClick={() =>
												setSelected((prev) => ({
													...prev,
													[group.optionTypeSlug]: value.valueSlug,
												}))
											}
										>
											{value.value}
										</Button>
									);
								})}
							</div>
						</div>
					))}
				</div>
			) : null}

			<div className="flex items-center justify-between gap-4">
				{resolved ? (
					<span className="font-bold text-lg">
						<Price price={resolved.price} />
					</span>
				) : null}
				{!resolved || resolved.stock === 0 ? (
					<Badge variant="outline" className="rounded-none uppercase">
						Out of stock
					</Badge>
				) : null}
			</div>

			<AddToCartButton product={product} variant={resolved} />
		</div>
	);
}
