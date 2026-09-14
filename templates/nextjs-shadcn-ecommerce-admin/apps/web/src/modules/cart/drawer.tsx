"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Price } from "@/lib/currency";
import { useCartDrawer } from "./context";
import { useCartStore } from "./store";

/**
 * The cart panel content — new for this template (no single munod file maps
 * onto it 1:1; munod's own version is inlined inside its much larger
 * `app-sidebar.tsx`'s `CartSidebar`, which this template does not port, see
 * `shell.tsx`). Reuses the ported `Drawer` primitive (already available from
 * Phase 5's shadcn shell) instead of munod's own `SlidePanel`.
 */
export function CartDrawer() {
	const { open, setOpen } = useCartDrawer();
	const router = useRouter();
	const { items, updateQuantity, removeItem } = useCartStore();

	const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
	const totalPrice = items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);

	return (
		<Drawer open={open} onOpenChange={setOpen} direction="right">
			<DrawerContent className="w-full sm:max-w-sm">
				<DrawerHeader>
					<DrawerTitle>Cart ({totalItems})</DrawerTitle>
				</DrawerHeader>

				<div className="flex-1 overflow-y-auto px-4">
					{items.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							Your cart is empty.
						</p>
					) : (
						<ul className="space-y-4">
							{items.map((item) => (
								<li key={item.variantId} className="flex gap-3">
									<Link
										href={`/products/${item.productSlug}`}
										onClick={() => setOpen(false)}
										className="relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted"
									>
										{item.coverImage ? (
											<Image
												src={item.coverImage}
												alt={item.name}
												fill
												sizes="64px"
												className="object-cover"
											/>
										) : null}
									</Link>
									<div className="flex flex-1 flex-col gap-1">
										<div className="flex items-start justify-between gap-2">
											<span className="font-medium text-sm">
												{item.name}
												{item.variantLabel ? ` — ${item.variantLabel}` : ""}
											</span>
											<Price price={item.price * item.quantity} />
										</div>
										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="icon"
												className="size-6"
												onClick={() => updateQuantity(item.variantId, -1)}
											>
												<Minus className="size-3" />
											</Button>
											<span className="text-sm">{item.quantity}</span>
											<Button
												type="button"
												variant="outline"
												size="icon"
												className="size-6"
												onClick={() => updateQuantity(item.variantId, 1)}
											>
												<Plus className="size-3" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="ml-auto size-6"
												onClick={() => removeItem(item.variantId)}
											>
												<Trash2 className="size-3" />
											</Button>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				<DrawerFooter>
					<div className="flex items-center justify-between font-medium text-sm">
						<span>Total</span>
						<Price price={totalPrice} />
					</div>
					<Button
						type="button"
						disabled={items.length === 0}
						onClick={() => {
							setOpen(false);
							router.push("/checkout");
						}}
					>
						Checkout
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
