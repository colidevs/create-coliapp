"use client";

import Image from "next/image";
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
 *
 * **Thumbnail addendum (`sdd/ecommerce-product-variants/apply-progress`
 * PR15)**: an option value carrying an `imageUrl` (e.g. a Color/Material
 * value) renders a small swatch thumbnail inside its button, matching
 * munod's real production pattern (toggle chips with a per-value swatch,
 * not plain text pills). An option value with no `imageUrl` renders exactly
 * as before — this is a strict additive enhancement, never a regression.
 *

 * **Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11)**:
 * `defaultVariant` is used ONLY to seed the initial `selected` state below —
 * it must NEVER be passed as `resolveVariant`'s own `fallback` argument for
 * the LIVE render. Passing it there (the original bug) meant a buyer
 * selecting an option combination that matches NO real variant (e.g. this
 * product has S/Black, M/Black, L/White but not M/White) silently resolved
 * to the DEFAULT variant instead — the option buttons visually showed the
 * buyer's actual (impossible) selection highlighted, but `AddToCartButton`
 * received a DIFFERENT variant than what was shown, so the wrong item
 * silently entered the cart with zero warning. `resolveVariant` with no
 * fallback correctly returns `undefined` for a live selection matching no
 * variant — `AddToCartButton` already handles `undefined` (disabled,
 * "Out of stock"); the block below distinguishes that case from a real
 * zero-stock variant with its own "Not available in this combination"
 * message.
 */
export function VariantSelector({ product }: { product: PublicProduct }) {
	const { variants } = product;
	const defaultVariant = resolveDefaultVariant(product);
	const groups = groupVariantOptions(variants);

	const [selected, setSelected] = useState<SelectedVariantOptions>(() =>
		initialSelectedOptions(defaultVariant),
	);

	const resolved = resolveVariant(variants, selected);

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
											{value.imageUrl ? (
												<span className="relative size-6 shrink-0 overflow-hidden rounded-full border">
													<Image
														src={value.imageUrl}
														alt=""
														fill
														sizes="24px"
														className="object-cover"
													/>
												</span>
											) : null}
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
				{!resolved ? (
					<Badge variant="outline" className="rounded-none uppercase">
						Not available in this combination
					</Badge>
				) : resolved.stock === 0 ? (
					<Badge variant="outline" className="rounded-none uppercase">
						Out of stock
					</Badge>
				) : null}
			</div>

			<AddToCartButton product={product} variant={resolved} />
		</div>
	);
}
