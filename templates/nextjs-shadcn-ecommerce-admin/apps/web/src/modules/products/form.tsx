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
import { createProductAction, updateProductAction } from "./actions";
import {
	type Product,
	type ProductFormValues,
	productFormSchema,
} from "./types";

/**
 * NOT a port of munod's real `products/form.tsx` — that form is built on
 * `@tanstack/react-form` plus minio image upload, dimensions, tags,
 * product-type, discount, home-image fields (`code/description/price/
 * unit_price/...`), none of which this template's actual generated
 * `Product`/`ProductCreate` schema carries (confirmed against
 * `apps/api/src/v1/modules/admin/products/types.ts` directly — this
 * template's own product is flat: name/code/altCode/description/price/
 * stock/stockMin/coverImage(a URL string)/categoryId/isActive). React Hook
 * Form + `zodResolver`, same as `modules/categories/form.tsx`.
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
			code: product?.code ?? "",
			altCode: product?.altCode ?? "",
			description: product?.description ?? "",
			price: product?.price ?? 0,
			stock: product?.stock ?? 0,
			stockMin: product?.stockMin ?? 0,
			coverImage: product?.coverImage ?? "",
			categoryId: product?.categoryId ?? "",
			isActive: product?.isActive ?? true,
		},
	});

	async function onSubmit(values: ProductFormValues) {
		setIsPending(true);

		// Conditionally include each optional field (ADR 0030's
		// `exactOptionalPropertyTypes` floor rejects `code: undefined` etc.
		// against `ProductCreate`/`ProductUpdate`'s optional, non-explicit-
		// undefined fields) — omitting a blanked-out field means "leave
		// unset" on create and "don't change it" on update, never an explicit
		// null-out (this form has no dedicated "clear this field" affordance).
		const payload = {
			name: values.name,
			price: values.price,
			isActive: values.isActive,
			...(values.code ? { code: values.code } : {}),
			...(values.altCode ? { altCode: values.altCode } : {}),
			...(values.description ? { description: values.description } : {}),
			...(values.stock !== undefined ? { stock: values.stock } : {}),
			...(values.stockMin !== undefined ? { stockMin: values.stockMin } : {}),
			...(values.coverImage ? { coverImage: values.coverImage } : {}),
			...(values.categoryId ? { categoryId: values.categoryId } : {}),
		};

		const result = product
			? await updateProductAction(product.id, payload)
			: await createProductAction(payload);

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
					<Label htmlFor="code">Code</Label>
					<Input id="code" {...register("code")} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="altCode">Alt. code</Label>
					<Input id="altCode" {...register("altCode")} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="price">Price</Label>
					<Input
						id="price"
						type="number"
						step="0.01"
						{...register("price", { valueAsNumber: true })}
					/>
					{errors.price ? (
						<p className="text-destructive text-sm">{errors.price.message}</p>
					) : null}
				</div>
				<div className="space-y-1">
					<Label htmlFor="stock">Stock</Label>
					<Input
						id="stock"
						type="number"
						{...register("stock", { valueAsNumber: true })}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="stockMin">Minimum stock</Label>
					<Input
						id="stockMin"
						type="number"
						{...register("stockMin", { valueAsNumber: true })}
					/>
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
			</div>
		</form>
	);
}
