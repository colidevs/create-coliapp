"use client";

import { Field, FieldError, FieldGroup, FieldLabel } from "@colidevs/ui/field";
import { CheckboxField, SelectField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 *
 * **`@colidevs/ui` adoption**: `categoryId`/`isActive` now use the shared
 * `SelectField`/`CheckboxField` composed-form-fields layer
 * (`sdd/ecommerce-product-variants/apply-progress` PR18). Safe here — each
 * renders at most once on this page; both carry a hardcoded, non-`field.name`
 * DOM id internally (`framework/packages/ui/src/form-fields.tsx`), so a
 * second instance of either on the same page would collide (see
 * `modules/variant-option-values/form.tsx`'s identical note for the one case
 * where that constraint blocked a swap). `name`/`coverImage`/`description`
 * stay hand-rolled — `InputField`/`TextareaField` carry the same hardcoded-id
 * bug and this page has multiple plain-text inputs.
 *
 * **Structure pass (munod parity, hefesto `design-to-code`)**: body now
 * mirrors munod's real two-column product-form layout — left column stacks
 * `name` above `description`, right column pairs `coverImage`+`categoryId`
 * in a `Field orientation="responsive"` row (side-by-side on desktop,
 * stacked on mobile), via `@colidevs/ui`'s `Field`/`FieldGroup` composition
 * instead of a bare `grid gap-4 sm:grid-cols-2` div. The three hand-rolled
 * fields now compose `Field`/`FieldLabel`/`FieldError` instead of a
 * `space-y-1` div + `<Label>` + ad hoc `<p>`. Button order fixed to
 * outline-then-primary; "Manage variants" stays a third, distinct action
 * after the primary button, not part of the cancel/submit pair.
 * `description` deliberately stays a hand-rolled `<Textarea>`, not
 * `@colidevs/ui`'s `TextareaField` — verified live in the pilot rebuild
 * this template feeds (`pilot-cumbre`): `TextareaField`'s underlying
 * `InputGroup`/`InputGroupTextarea` primitives collapse to near-zero width
 * inside a two-column `Field` layout, rendering the value one character per
 * line, overflowing outside the field box. That is a bug in
 * `@colidevs/ui@0.1.0`'s shipped primitives (or their interaction with
 * nested `Field` containers), not something to work around here.
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
			className="max-w-2xl"
		>
			<FieldGroup>
				<Field className="flex flex-col gap-8 lg:flex-row">
					<Field>
						<form.Field
							name="name"
							validators={{ onChange: productFormSchema.shape.name }}
						>
							{(field) => {
								const isInvalid = field.state.meta.errors.length > 0;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Name</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={isInvalid}
										/>
										{isInvalid ? (
											<FieldError>
												{fieldErrorMessage(field.state.meta.errors)}
											</FieldError>
										) : null}
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="description">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>Description</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										rows={4}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
								</Field>
							)}
						</form.Field>
					</Field>
					<Field>
						<Field orientation="responsive" className="*:flex-1">
							<form.Field
								name="coverImage"
								// `.unwrap()` — the field's own value type is always `string`
								// (defaulted to `""`, never `undefined`), so the validator must
								// be the schema's inner, non-optional shape for TanStack
								// Form's Standard Schema input type to line up.
								validators={{
									onChange: productFormSchema.shape.coverImage.unwrap(),
								}}
							>
								{(field) => {
									const isInvalid = field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Cover image URL
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={isInvalid}
											/>
											{isInvalid ? (
												<FieldError>
													{fieldErrorMessage(field.state.meta.errors)}
												</FieldError>
											) : null}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="categoryId">
								{(field) => (
									<SelectField
										field={field}
										title="Category"
										placeholder="No category"
										options={categories.map((category) => ({
											id: category.id,
											label: category.name,
											value: category.id,
										}))}
									/>
								)}
							</form.Field>
						</Field>
					</Field>
				</Field>

				{product ? (
					<form.Field name="isActive">
						{(field) => <CheckboxField field={field} title="Active" />}
					</form.Field>
				) : null}

				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/admin/products")}
					>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isPending || isSubmitting}>
								{isPending ? "Saving…" : product ? "Save changes" : "Create"}
							</Button>
						)}
					</form.Subscribe>
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
			</FieldGroup>
		</form>
	);
}
