"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/generated/model";
import { getQueryClient } from "@/lib/query";
import { createProductAction, updateProductAction } from "./actions";
import {
	type Product,
	type ProductFormValues,
	productFormSchema,
} from "./types";

/**
 * NOT a port of munod's real `products/form.tsx` — that form is built on
 * `@tanstack/react-form` plus minio image upload, dimensions, tags,
 * product-type, discount, home-image fields, none of which this template's
 * actual generated `Product`/`ProductCreate` schema carries.
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, design D3/D4)**: this form
 * manages catalog metadata only — `code`/`altCode`/`price`/`stock`/
 * `stockMin` moved to `product_variants` and are no longer editable here.
 * A product is created as a draft (`isActive: false`); publishing it is
 * gated server-side by a deferrable constraint trigger requiring at least
 * one active variant (design's own publish invariant) — this form does not
 * enforce that itself, it only surfaces the resulting error via
 * `toActionState()` like any other server-side rejection. `isActive` stays
 * edit-only (never shown/sent on create), same convention as
 * `modules/variant-option-values/form.tsx` — `ProductCreateSchema` has no
 * such field at all.
 */
export function ProductForm({
	product,
	categories,
}: {
	product?: Product;
	categories: Category[];
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const {
		register,
		handleSubmit,
		setError,
		control,
		formState: { errors },
	} = useForm<ProductFormValues>({
		resolver: zodResolver(productFormSchema),
		defaultValues: {
			name: product?.name ?? "",
			description: product?.description ?? "",
			coverImage: product?.coverImage ?? "",
			categoryId: product?.categoryId ?? "",
			isActive: product?.isActive ?? false,
		},
	});

	async function onSubmit(values: ProductFormValues) {
		setIsPending(true);

		// Conditionally include each optional field (ADR 0030's
		// `exactOptionalPropertyTypes` floor rejects `description: undefined`
		// etc. against `ProductCreate`/`ProductUpdate`'s optional,
		// non-explicit-undefined fields) — omitting a blanked-out field means
		// "leave unset" on create and "don't change it" on update, never an
		// explicit null-out (this form has no dedicated "clear this field"
		// affordance).
		// `isActive` is never sent on create — `ProductCreateSchema` has no such
		// field at all (design D3: every product is created as a draft,
		// `is_active: false` is the schema default). Only `PATCH` (update) can
		// flip it, and doing so is exactly what the publish invariant trigger
		// guards.
		const result = product
			? await updateProductAction(product.id, {
					name: values.name,
					isActive: values.isActive,
					...(values.description ? { description: values.description } : {}),
					...(values.coverImage ? { coverImage: values.coverImage } : {}),
					...(values.categoryId ? { categoryId: values.categoryId } : {}),
				})
			: await createProductAction({
					name: values.name,
					...(values.description ? { description: values.description } : {}),
					...(values.coverImage ? { coverImage: values.coverImage } : {}),
					...(values.categoryId ? { categoryId: values.categoryId } : {}),
				});

		setIsPending(false);

		if (!result.success) {
			if (result.errors) {
				for (const [field, messages] of Object.entries(result.errors)) {
					setError(field as keyof ProductFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
				}
			}
			if (result.message) toast.error(result.message);
			return;
		}

		toast.success(product ? "Product updated." : "Product created.");
		// `getQueryClient()`'s browser singleton (`lib/query.ts`) has a global
		// `staleTime: 60_000` (tuned for the storefront's SSR-hydration pairing,
		// not for this admin list) — without an explicit invalidation, the
		// products list keeps serving its pre-write cached page for up to a
		// minute after a client-side `router.push()` back to it. Real bug
		// found live (PR7b) via `e2e/admin-flow.spec.ts`'s own create flow: the
		// created row was silently invisible until a full page reload.
		getQueryClient().invalidateQueries({ queryKey: ["admin-products"] });
		router.push("/admin/products");
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1">
					<Label htmlFor="name">Name</Label>
					<Input id="name" {...register("name")} />
					{errors.name ? (
						<p className="text-destructive text-sm">{errors.name.message}</p>
					) : null}
				</div>
				<div className="space-y-1">
					<Label htmlFor="coverImage">Cover image URL</Label>
					<Input id="coverImage" {...register("coverImage")} />
					{errors.coverImage ? (
						<p className="text-destructive text-sm">
							{errors.coverImage.message}
						</p>
					) : null}
				</div>
				<Controller
					name="categoryId"
					control={control}
					render={({ field }) => (
						<div className="space-y-1">
							<Label>Category</Label>
							{/* Conditionally spread `value` (ADR 0030 floor) — `field.value`
							 is `string | undefined` (unselected), but `Select`'s own
							 `value?` prop type has no explicit `| undefined`. */}
							<Select
								{...(field.value ? { value: field.value } : {})}
								onValueChange={field.onChange}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="No category" />
								</SelectTrigger>
								<SelectContent>
									{categories.map((category) => (
										<SelectItem key={category.id} value={category.id}>
											{category.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				/>
			</div>
			<div className="space-y-1">
				<Label htmlFor="description">Description</Label>
				<Textarea id="description" rows={4} {...register("description")} />
			</div>
			{product ? (
				<Controller
					name="isActive"
					control={control}
					render={({ field }) => (
						<div className="flex items-center gap-2">
							<Checkbox
								id="isActive"
								checked={field.value}
								onCheckedChange={(checked) => field.onChange(checked === true)}
							/>
							<Label htmlFor="isActive">Active</Label>
						</div>
					)}
				/>
			) : null}
			<div className="flex gap-2">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving…" : product ? "Save changes" : "Create"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/admin/products")}
				>
					Cancel
				</Button>
				{product ? (
					<Button
						type="button"
						variant="secondary"
						onClick={() =>
							router.push(`/admin/products/${product.id}/variants`)
						}
					>
						Manage variants ({product.variantCount})
					</Button>
				) : null}
			</div>
		</form>
	);
}
