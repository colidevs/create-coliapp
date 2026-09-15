"use client";

import { NumberStepperField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VariantOptionType, VariantOptionValue } from "@/generated/model";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import { createVariantAction, updateVariantAction } from "./actions";
import {
	computeMissingRequiredOptionTypes,
	type Variant,
	type VariantFormValues,
	variantFormSchema,
} from "./types";

/**
 * Structural sibling of `modules/product-images/form.tsx`/`modules/
 * variant-option-values/form.tsx` — same scoped-by-parent-id convention
 * (`productId`, disabled once nested under a product route). The extra
 * surface here is the option-value picker: `optionTypes`/`optionValues`
 * (fetched server-side by the caller — `add/page.tsx`/`[variantId]/update/
 * page.tsx`, same pattern as `modules/products/form.tsx`'s own `categories`
 * prop) are grouped by option type and rendered as one checkbox group per
 * type, mirroring the storefront's own `<VariantSelector>` grouping
 * (`variant-selection.ts#groupVariantOptions`) but for SELECTION rather than
 * single-value matching — a variant can (and typically does) carry exactly
 * one value per option type.
 *
 * Built on `@tanstack/react-form` (`colidevs/hefesto#104`, correcting
 * `console-golden-path.md` decision 5's prior React Hook Form pick).
 *
 * **Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11)**: this
 * form now DOES enforce that, once the product has established real option
 * types via sibling variants (`requiredOptionTypeIds`, computed by the
 * calling `add`/`update` page) — a variant left with zero (or a mismatched)
 * selection silently became unreachable on the storefront (`variant-
 * selection.ts#resolveVariant`'s every/some predicate can never match a
 * candidate whose own `options` is empty once any option key is selected).
 * This is advisory, immediate UX feedback only, now expressed as the
 * `optionValueIds` field's own `validators.onSubmit` — `apps/api`'s own
 * `admin/variants/repository.ts#assertOptionSelectionsSatisfyProduct` is the
 * real, server-side enforcement (`variant_option_selections`'s composite-PK
 * join itself still carries no DB-level constraint for this).
 *
 * **Thumbnail addendum (`sdd/ecommerce-product-variants/apply-progress`
 * PR15)**: an option value carrying an `imageUrl` renders a small swatch
 * thumbnail next to its checkbox label, mirroring the storefront's own
 * `<VariantSelector>` treatment and munod's real production pattern. An
 * option value with no `imageUrl` renders exactly as before.
 *
 * **`@colidevs/ui` adoption (evaluated, partially applied)**: `stock`/
 * `stockMin`/`displayOrder` now use the shared `NumberStepperField` (id
 * derived from `field.name`, no collision risk regardless of instance
 * count). Deliberately NOT adopted here, with reasons:
 * - `price` — `@colidevs/ui`'s `PriceInputField` assumes a cents-digit-entry
 *   convention (typed digits divided by 100); this field uses direct decimal
 *   entry (`step="0.01"`). Not an equivalent swap, would change real UX
 *   behavior for existing users of this form.
 * - `isDefault`/`isActive` — `CheckboxField` has a hardcoded, non-`field.name`
 *   DOM id (`framework/packages/ui/src/form-fields.tsx`); this form can
 *   render BOTH simultaneously when editing (`isDefault` always +
 *   `isActive` once `variant` is set), which would collide on
 *   `id="checkbox_field"`. Left hand-rolled.
 * - The `optionValueIds` picker — `@colidevs/ui`'s `ToggleGroupField`/
 *   `CheckboxField` render a flat option list with no per-type grouping and
 *   no `imageUrl` thumbnail support; this picker groups by option type,
 *   renders thumbnails, and drives a custom missing-type validation message.
 *   Swapping would regress real, shipped functionality (PR11/PR15) — left
 *   hand-rolled.
 */
export function VariantForm({
	variant,
	defaultProductId,
	optionTypes,
	optionValues,
	requiredOptionTypeIds = [],
}: {
	variant?: Variant;
	// Explicit `| undefined` (ADR 0030 floor) — nested route callers pass this
	// from `params.id` (a plain route segment, not a search param), but the
	// prop stays optional for a hypothetical future non-nested caller.
	defaultProductId?: string | undefined;
	optionTypes: VariantOptionType[];
	optionValues: VariantOptionValue[];
	requiredOptionTypeIds?: string[];
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			productId: variant?.productId ?? defaultProductId ?? "",
			code: variant?.code ?? "",
			altCode: variant?.altCode ?? "",
			price: variant?.price ?? 0,
			stock: variant?.stock ?? 0,
			stockMin: variant?.stockMin ?? 0,
			isDefault: variant?.isDefault ?? false,
			isActive: variant?.isActive ?? true,
			displayOrder: variant?.displayOrder ?? 0,
			optionValueIds: variant?.optionValueIds ?? [],
		} satisfies VariantFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			// Conditionally include each optional field (ADR 0030's
			// `exactOptionalPropertyTypes` floor rejects `code: undefined` etc.
			// against `VariantCreate`/`VariantUpdate`'s optional, non-explicit-
			// undefined fields). `optionValueIds` is always sent — an empty array
			// is a meaningful "no selections", never "leave unset".
			const result = variant
				? await updateVariantAction(variant.id, {
						...(values.code ? { code: values.code } : {}),
						...(values.altCode ? { altCode: values.altCode } : {}),
						price: values.price,
						...(values.stock !== undefined ? { stock: values.stock } : {}),
						...(values.stockMin !== undefined
							? { stockMin: values.stockMin }
							: {}),
						isDefault: values.isDefault,
						isActive: values.isActive,
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
						optionValueIds: values.optionValueIds,
					})
				: await createVariantAction({
						productId: values.productId,
						...(values.code ? { code: values.code } : {}),
						...(values.altCode ? { altCode: values.altCode } : {}),
						price: values.price,
						...(values.stock !== undefined ? { stock: values.stock } : {}),
						...(values.stockMin !== undefined
							? { stockMin: values.stockMin }
							: {}),
						isDefault: values.isDefault,
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
						optionValueIds: values.optionValueIds,
					});

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(field as keyof VariantFormValues, (meta) => ({
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

			toast.success(variant ? "Variant updated." : "Variant created.");
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({ queryKey: ["variants"] });
			router.push(redirectTo);
		},
	});

	const productId = variant?.productId ?? defaultProductId;
	const redirectTo = productId
		? `/admin/products/${productId}/variants`
		: "/admin/products";

	const groupedOptions = optionTypes
		.filter((type) => type.isActive)
		.slice()
		.sort((a, b) => a.displayOrder - b.displayOrder)
		.map((type) => ({
			type,
			values: optionValues
				.filter((value) => value.optionTypeId === type.id && value.isActive)
				.slice()
				.sort((a, b) => a.displayOrder - b.displayOrder),
		}))
		.filter((group) => group.values.length > 0);

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
				<form.Field name="productId">
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Product ID</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								disabled={Boolean(variant) || Boolean(defaultProductId)}
							/>
							{field.state.meta.errors.length > 0 ? (
								<p className="text-destructive text-sm">
									{fieldErrorMessage(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>
				<form.Field name="code">
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Code</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="altCode">
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Alt. code</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</div>
					)}
				</form.Field>
				<form.Field
					name="price"
					validators={{ onChange: variantFormSchema.shape.price }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Price</Label>
							<Input
								id={field.name}
								name={field.name}
								type="number"
								step="0.01"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.valueAsNumber)
								}
							/>
							{field.state.meta.errors.length > 0 ? (
								<p className="text-destructive text-sm">
									{fieldErrorMessage(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>
				<form.Field name="stock">
					{(field) => <NumberStepperField field={field} title="Stock" />}
				</form.Field>
				<form.Field name="stockMin">
					{(field) => (
						<NumberStepperField field={field} title="Minimum stock" />
					)}
				</form.Field>
				<form.Field name="displayOrder">
					{(field) => (
						<NumberStepperField field={field} title="Display order" />
					)}
				</form.Field>
			</div>

			<form.Field name="isDefault">
				{(field) => (
					<div className="flex items-center gap-2">
						<Checkbox
							id={field.name}
							checked={field.state.value}
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
						<Label htmlFor={field.name}>Default variant</Label>
					</div>
				)}
			</form.Field>

			{variant ? (
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

			<form.Field
				name="optionValueIds"
				validators={{
					// Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11):
					// immediate UX feedback BEFORE ever calling the server action — the
					// real enforcement still happens server-side regardless of this
					// check. Runs at submit time only, over this field's own current
					// value (the selected option-value IDs), so it composes naturally
					// with TanStack Form's own submit-blocking validator contract.
					onSubmit: ({ value }) => {
						const missingTypeIds = computeMissingRequiredOptionTypes(
							requiredOptionTypeIds,
							value,
							optionValues,
						);
						if (missingTypeIds.length === 0) return undefined;
						const names = missingTypeIds
							.map(
								(typeId) =>
									optionTypes.find((t) => t.id === typeId)?.name ?? typeId,
							)
							.join(", ");
						return `Select exactly one value for: ${names} — this product already uses ${missingTypeIds.length === 1 ? "that option type" : "these option types"}.`;
					},
				}}
			>
				{(field) =>
					groupedOptions.length > 0 ? (
						<div className="space-y-3">
							<Label>Options</Label>
							{groupedOptions.map(({ type, values }) => (
								<div key={type.id} className="space-y-1">
									<p className="text-muted-foreground text-sm">{type.name}</p>
									<div className="flex flex-wrap gap-4">
										{values.map((value) => {
											const checked = field.state.value.includes(value.id);
											const inputId = `option-value-${value.id}`;
											return (
												<div
													key={value.id}
													className="flex items-center gap-2 text-sm"
												>
													<Checkbox
														id={inputId}
														checked={checked}
														onCheckedChange={(next) => {
															field.handleChange(
																next === true
																	? [...field.state.value, value.id]
																	: field.state.value.filter(
																			(id) => id !== value.id,
																		),
															);
														}}
													/>
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
													<Label htmlFor={inputId}>{value.value}</Label>
												</div>
											);
										})}
									</div>
								</div>
							))}
							{field.state.meta.errors.length > 0 ? (
								<p className="text-destructive text-sm">
									{fieldErrorMessage(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					) : (
						<p className="text-muted-foreground text-sm">
							No option values are available yet — create an option type and its
							values first (Option types).
						</p>
					)
				}
			</form.Field>

			<div className="flex gap-2">
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isPending || isSubmitting}>
							{isPending ? "Saving…" : variant ? "Save changes" : "Create"}
						</Button>
					)}
				</form.Subscribe>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push(redirectTo)}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
