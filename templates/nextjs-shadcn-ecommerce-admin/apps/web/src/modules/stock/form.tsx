"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQueryClient } from "@/lib/query";
import { updateStockAction } from "./actions";
import {
	type Stock,
	type StockUpdateFormValues,
	stockUpdateFormSchema,
} from "./types";

/**
 * NOT a port of munod's `stock/form.tsx` (a `@tanstack/react-form` dialog
 * embedded, single-field STOCK-vs-STOCK_MIN toggle) — React Hook Form +
 * `zodResolver`, same pattern as every other module's form
 * (`console-golden-path.md` decision 5), with both `stock`/`stockMin` fields
 * edited together on this module's own dedicated `[id]/update` page.
 */
export function StockForm({ stock }: { stock: Stock }) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors },
	} = useForm<StockUpdateFormValues>({
		resolver: zodResolver(stockUpdateFormSchema),
		defaultValues: {
			stock: stock.stock,
			stockMin: stock.stockMin,
		},
	});

	async function onSubmit(values: StockUpdateFormValues) {
		setIsPending(true);

		const result = await updateStockAction(stock.id, values);

		setIsPending(false);

		if (!result.success) {
			if (result.errors) {
				for (const [field, messages] of Object.entries(result.errors)) {
					setError(field as keyof StockUpdateFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
				}
			}
			if (result.message) toast.error(result.message);
			return;
		}

		toast.success("Stock updated.");
		// See `modules/products/form.tsx`'s identical comment — the browser
		// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
		// otherwise serves this list's pre-write cached page for up to a
		// minute after this `router.push()`.
		getQueryClient().invalidateQueries({ queryKey: ["admin-stock"] });
		router.push("/admin/stock");
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
			<div className="space-y-1">
				<Label htmlFor="stock">Stock</Label>
				<Input
					id="stock"
					type="number"
					{...register("stock", { valueAsNumber: true })}
				/>
				{errors.stock ? (
					<p className="text-destructive text-sm">{errors.stock.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="stockMin">Minimum stock</Label>
				<Input
					id="stockMin"
					type="number"
					{...register("stockMin", { valueAsNumber: true })}
				/>
				{errors.stockMin ? (
					<p className="text-destructive text-sm">{errors.stockMin.message}</p>
				) : null}
			</div>
			<div className="flex gap-2">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving…" : "Save changes"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/admin/stock")}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
