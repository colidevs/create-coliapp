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
import { createProductImageAction, updateProductImageAction } from "./actions";
import {
	type ProductImage,
	type ProductImageFormValues,
	productImageFormSchema,
} from "./types";

/**
 * This template ships `product-images` as a standalone CRUD entity (design's
 * own directory tree), unlike munod — where images are managed inline
 * inside `products/form.tsx`'s minio-upload gallery field (no standalone
 * admin page exists there at all). `url` is a plain string field here (no
 * upload — this template has no MinIO wiring), matching `products/form.tsx`'s
 * own `coverImage` field.
 */
export function ProductImageForm({
	image,
	defaultProductId,
}: {
	image?: ProductImage;
	// Explicit `| undefined` (ADR 0030 floor) — the `add/page.tsx` caller
	// derives this from `await searchParams`, a genuine `string | undefined`.
	defaultProductId?: string | undefined;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors },
	} = useForm<ProductImageFormValues>({
		resolver: zodResolver(productImageFormSchema),
		defaultValues: {
			productId: image?.productId ?? defaultProductId ?? "",
			url: image?.url ?? "",
			position: image?.position ?? 0,
		},
	});

	async function onSubmit(values: ProductImageFormValues) {
		setIsPending(true);

		// Conditionally include `position` (ADR 0030's `exactOptionalPropertyTypes`
		// floor rejects `position: undefined` against `ProductImageUpdate`/
		// `ProductImageCreate`'s optional, non-explicit-undefined `position?`).
		const result = image
			? await updateProductImageAction(image.id, {
					url: values.url,
					...(values.position !== undefined
						? { position: values.position }
						: {}),
				})
			: await createProductImageAction({
					productId: values.productId,
					url: values.url,
					...(values.position !== undefined
						? { position: values.position }
						: {}),
				});

		setIsPending(false);

		if (!result.success) {
			if (result.errors) {
				for (const [field, messages] of Object.entries(result.errors)) {
					setError(field as keyof ProductImageFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
				}
			}
			if (result.message) toast.error(result.message);
			return;
		}

		toast.success(image ? "Image updated." : "Image created.");
		// See `modules/products/form.tsx`'s identical comment — the browser
		// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
		// otherwise serves this list's pre-write cached page for up to a
		// minute after this `router.push()`.
		getQueryClient().invalidateQueries({ queryKey: ["product-images"] });
		router.push("/admin/product-images");
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
			<div className="space-y-1">
				<Label htmlFor="productId">Product ID</Label>
				<Input
					id="productId"
					{...register("productId")}
					disabled={Boolean(image)}
				/>
				{errors.productId ? (
					<p className="text-destructive text-sm">{errors.productId.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="url">Image URL</Label>
				<Input id="url" {...register("url")} />
				{errors.url ? (
					<p className="text-destructive text-sm">{errors.url.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="position">Position</Label>
				<Input
					id="position"
					type="number"
					{...register("position", { valueAsNumber: true })}
				/>
			</div>
			<div className="flex gap-2">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving…" : image ? "Save changes" : "Create"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/admin/product-images")}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
