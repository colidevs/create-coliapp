"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { fieldErrorMessage } from "@/lib/utils";
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
 *
 * **Migrated to `@tanstack/react-form`** (`colidevs/hefesto#104` — ADR 0001
 * Decision 5 was corrected: real colidevs production code, `munod` and
 * `org-jaulasvacias`, exclusively uses TanStack Form, never React Hook
 * Form). Only the pre-submit client-side validation layer changed — the
 * `toActionState()` server round-trip below is untouched.
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

	const form = useForm({
		defaultValues: {
			name: product?.name ?? "",
			description: product?.description ?? "",
			coverImage: product?.coverImage ?? "",
			categoryId: product?.categoryId ?? "",
			isActive: product?.isActive ?? false,
		} satisfies ProductFormValues,
		onSubmit: async ({ value: values }) => {
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
						form.setFieldMeta(field as keyof ProductFormValues, (meta) => ({
							...meta,
							errorMap: {
								...meta.errorMap,
								onSubmit: messages[0] ?? "Invalid value",
							},
						}));
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
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="max-w-2xl space-y-4"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field
					name="name"
					validators={{ onChange: productFormSchema.shape.name }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Name</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
							{field.state.meta.errors.length > 0 ? (
								<p className="text-destructive text-sm">
									{fieldErrorMessage(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>
				<form.Field
					name="coverImage"
					// `.unwrap()` — the field's own value type is always `string`
					// (defaulted to `""`, never `undefined`), so the validator must be
					// the schema's inner, non-optional shape for TanStack Form's
					// Standard Schema input type to line up.
					validators={{ onChange: productFormSchema.shape.coverImage.unwrap() }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Cover image URL</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
							{field.state.meta.errors.length > 0 ? (
								<p className="text-destructive text-sm">
									{fieldErrorMessage(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>
				<form.Field name="categoryId">
					{(field) => (
						<div className="space-y-1">
							<Label>Category</Label>
							{/* Conditionally spread `value` (ADR 0030 floor) — `field.state.value`
							 is `string | undefined` (unselected), but `Select`'s own
							 `value?` prop type has no explicit `| undefined`. */}
							<Select
								{...(field.state.value ? { value: field.state.value } : {})}
								onValueChange={field.handleChange}
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
				</form.Field>
			</div>
			<form.Field name="description">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Description</Label>
						<Textarea
							id={field.name}
							name={field.name}
							rows={4}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</div>
				)}
			</form.Field>
			{product ? (
				<form.Field name="isActive">
					{(field) => (
						<div className="flex items-center gap-2">
							<Checkbox
								id={field.name}
								checked={field.state.value}
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
							/>
							<Label htmlFor={field.name}>Active</Label>
						</div>
					)}
				</form.Field>
			) : null}
			<div className="flex gap-2">
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isPending || isSubmitting}>
							{isPending ? "Saving…" : product ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
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
