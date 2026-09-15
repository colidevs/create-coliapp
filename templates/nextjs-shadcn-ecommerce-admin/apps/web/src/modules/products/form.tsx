"use client";

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@colidevs/ui/field";
import { SelectField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
 * A product is created active but as a draft (`isActive: true`,
 * `isPublished: false`); publishing it (`isPublished: true`) is gated
 * server-side by a deferrable constraint trigger requiring at least one
 * active variant (design's own publish invariant, extended by apply PR22 —
 * see that PR's fix note below) — this form does not enforce that itself,
 * it only surfaces the resulting error via `toActionState()` like any other
 * server-side rejection. `isActive`/`isPublished` both stay edit-only
 * (never shown/sent on create), same convention as
 * `modules/variant-option-values/form.tsx` — `ProductCreateSchema` has no
 * such fields at all.
 *
 * **`isActive`/`isPublished` split (PR22)**: fixes a real, confirmed
 * conflation bug — `isActive` used to do double duty as BOTH the
 * soft-delete marker (`repository.ts`'s `deleteOne()`) AND the draft/
 * publish gate, making a soft-deleted product indistinguishable from one
 * still being drafted. `isPublished` is a second, independent field —
 * matching munod's own real, separately-decided schema
 * (`munod/db/migrations/0029_enforce_product_has_active_variant.sql`).
 * Deliberately a plain checkbox, no "Draft/Published" status badge or
 * relabeling of `isActive` — Thomas's explicit instruction to keep this
 * short and simple.
 *
 * **Migrated to `@tanstack/react-form`** (`colidevs/hefesto#104` — ADR 0001
 * Decision 5 was corrected: real colidevs production code, `munod` and
 * `org-jaulasvacias`, exclusively uses TanStack Form, never React Hook
 * Form). Only the pre-submit client-side validation layer changed — the
 * `toActionState()` server round-trip below is untouched.
 *
 * **`@colidevs/ui` adoption**: `categoryId` uses the shared `SelectField`
 * composed-form-field (`sdd/ecommerce-product-variants/apply-progress`
 * PR18) — safe, it renders at most once on this page. `name`/`coverImage`/
 * `description` stay hand-rolled — `InputField`/`TextareaField` carry a
 * hardcoded, non-`field.name` DOM id bug and this page has multiple
 * plain-text inputs. `isActive`/`isPublished` (PR22) are ALSO hand-rolled,
 * NOT `CheckboxField` — `CheckboxField` has that exact same hardcoded-id
 * bug (`id: "checkbox_field"` literally, `framework/packages/ui/src/
 * form-fields.tsx`), and this page now renders two checkboxes
 * simultaneously when editing, which would collide. Same established
 * pattern `modules/variants/form.tsx` already uses for its own
 * `isDefault`+`isActive` pair: a bare `Field orientation="horizontal"` +
 * `Checkbox` + `FieldLabel`, `id={field.name}`-derived.
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
 *
 * **Grouping pass (PR21)**: the two columns are now `FieldSet` + `FieldLegend`
 * sections — "Basic info" (`name`, `description`) and "Catalog"
 * (`coverImage`, `categoryId`) — instead of two bare `Field` columns with no
 * section heading, mirroring `modules/variants/form.tsx`'s own grouping
 * convention. The edit-only checkbox row stays outside both sections, same
 * position as before — this pass was structural grouping only, not a
 * status-UI change (PR22 above is the one that added a second checkbox to
 * that row).
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
			isActive: product?.isActive ?? true,
			isPublished: product?.isPublished ?? false,
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
			// `isActive`/`isPublished` are never sent on create —
			// `ProductCreateSchema` has no such fields at all (a product is always
			// created active/`is_active: true` and a draft/`is_published: false`,
			// both schema defaults). Only `PATCH` (update) can flip either, and
			// setting `isPublished: true` is exactly what the publish invariant
			// trigger guards.
			const result = product
				? await updateProductAction(product.id, {
						name: values.name,
						isActive: values.isActive,
						isPublished: values.isPublished,
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
					<FieldSet className="flex-1">
						<FieldLegend>Basic info</FieldLegend>
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
					</FieldSet>
					<FieldSet className="flex-1">
						<FieldLegend>Catalog</FieldLegend>
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
					</FieldSet>
				</Field>

				{product ? (
					<div className="flex gap-6">
						<form.Field name="isActive">
							{(field) => (
								<Field orientation="horizontal" className="w-fit">
									<Checkbox
										id={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<FieldLabel htmlFor={field.name} className="font-normal">
										Active
									</FieldLabel>
								</Field>
							)}
						</form.Field>
						<form.Field name="isPublished">
							{(field) => (
								<Field orientation="horizontal" className="w-fit">
									<Checkbox
										id={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<FieldLabel htmlFor={field.name} className="font-normal">
										Published
									</FieldLabel>
								</Field>
							)}
						</form.Field>
					</div>
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
