"use client";

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@colidevs/ui/field";
import { SwitchField, NumberStepperField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { VariantOptionType } from "@/generated/model";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import {
	createVariantOptionValueAction,
	updateVariantOptionValueAction,
} from "./actions";
import {
	type VariantOptionValue,
	type VariantOptionValueFormValues,
	variantOptionValueFormSchema,
} from "./types";

/**
 * Structural port of `modules/product-images/form.tsx` — same
 * scoped-by-parent-id convention (`optionTypeId`, disabled once editing).
 * `slug` is never a form field: it is derived server-side from `value` on
 * both create and rename (design: "`slug` is derived from `value`"/
 * "Renaming `value` re-derives `slug`").
 *
 * Built on `@tanstack/react-form` (`colidevs/hefesto#104`, correcting
 * `console-golden-path.md` decision 5's prior React Hook Form pick).
 *
 * **DX fix (this session's review + `colidevs/hefesto#104`)**: `optionTypeId`
 * was a raw, editable UUID textbox — replaced with a real `<Select>`
 * populated from `optionTypes` (server-fetched by the `add`/`update` page
 * callers), matching `modules/products/form.tsx`'s own `categoryId` field
 * and `modules/variants/form.tsx`'s option-value picker. Pre-selected via
 * `defaultOptionTypeId` when reached from the "Manage values" deep link
 * (`?optionTypeId=`), and stays disabled once editing — same
 * `disabled={Boolean(optionValue)}` behavior as before.
 *
 * **`@colidevs/ui` adoption**: `isActive` now uses `@colidevs/ui`'s shared
 * `CheckboxField` (the real, published composed-form-fields layer munod/
 * org-jaulasvacias independently converged on —
 * `sdd/ecommerce-product-variants/apply-progress` PR18). Safe here because
 * it renders at most ONCE per page — `@colidevs/ui@0.1.0`'s `CheckboxField`
 * uses a hardcoded, non-field-derived DOM id internally (`id="checkbox_field"`
 * — `framework/packages/ui/src/form-fields.tsx`, not `field.name`-scoped
 * like `NumberStepperField`/`PriceInputField`), so a second instance on the
 * same page would collide. `optionTypeId` stays a hand-rolled `<Select>`
 * — `SelectField` has no `disabled` prop, and this field must stay disabled
 * once editing. `value`/`imageUrl`/`description`/`displayOrder` stay
 * hand-rolled `<Input>` — this page has multiple plain-text inputs, and
 * `InputField` carries the identical hardcoded-id bug (`id="input_field_name"`
 * for every instance, would collide across &gt;1 use).
 *
 * **Structure pass (munod parity, hefesto `design-to-code`)**: the four
 * hand-rolled fields now compose `@colidevs/ui`'s `Field`/`FieldLabel`/
 * `FieldError` primitives instead of a bare `space-y-1` div + `<Label>` +
 * ad hoc `<p>`. Grouping now uses `FieldGroup` instead of a bare
 * `space-y-4` div. Button order fixed to outline-then-primary.
 *
 * **Grouping pass (PR21)**: fields now sit inside three `FieldSet` +
 * `FieldLegend` sections — "Identification" (`optionTypeId`, `value`),
 * "Media" (`imageUrl`, `description`), "Display" (`displayOrder`,
 * `isActive`) — mirroring `modules/variants/form.tsx`'s own grouping
 * convention. `isActive` (edit-only, per the note above) stays inside
 * "Display" alongside `displayOrder`, with its exact current
 * `CheckboxField` rendering unchanged.
 *
 * Conditional rendering (hiding `imageUrl` for a "size"-like option type,
 * mirroring munod's own `option_type === "size"` check) was evaluated and
 * NOT applied — verified against the pilot rebuild this template feeds
 * (`pilot-cumbre`): `VariantOptionType` here has no `kind`/reserved marker
 * column, `name`/`slug` are fully freeform admin-authored text, and the
 * pilot's own real seed data names its size-equivalent type "Talla"
 * (Spanish), not "Size" — proving there is no stable string to key off.
 * `imageUrl` stays unconditionally rendered.
 */
export function VariantOptionValueForm({
	optionValue,
	optionTypes,
	defaultOptionTypeId,
}: {
	optionValue?: VariantOptionValue;
	optionTypes: VariantOptionType[];
	// Explicit `| undefined` (ADR 0030 floor) — the `add/page.tsx` caller
	// derives this from `await searchParams`, a genuine `string | undefined`.
	defaultOptionTypeId?: string | undefined;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			optionTypeId: optionValue?.optionTypeId ?? defaultOptionTypeId ?? "",
			value: optionValue?.value ?? "",
			imageUrl: optionValue?.imageUrl ?? "",
			description: optionValue?.description ?? "",
			displayOrder: optionValue?.displayOrder ?? 0,
			isActive: optionValue?.isActive ?? true,
		} satisfies VariantOptionValueFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			// Conditionally include optional fields (ADR 0030's
			// `exactOptionalPropertyTypes` floor rejects an explicit `undefined`
			// against `VariantOptionValueCreate`/`VariantOptionValueUpdate`'s
			// optional fields).
			const result = optionValue
				? await updateVariantOptionValueAction(optionValue.id, {
						value: values.value,
						...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
						...(values.description ? { description: values.description } : {}),
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
						isActive: values.isActive,
					})
				: await createVariantOptionValueAction({
						optionTypeId: values.optionTypeId,
						value: values.value,
						...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
						...(values.description ? { description: values.description } : {}),
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
					});

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(
							field as keyof VariantOptionValueFormValues,
							(meta) => ({
								...meta,
								errorMap: {
									...meta.errorMap,
									onSubmit: messages[0] ?? "Invalid value",
								},
							}),
						);
					}
				}
				if (result.message) toast.error(result.message);
				return;
			}

			toast.success(optionValue ? "Value updated." : "Value created.");
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({
				queryKey: ["variant-option-values"],
			});
			router.push(redirectTo);
		},
	});

	const redirectTo = optionValue
		? `/admin/variant-option-values?optionTypeId=${optionValue.optionTypeId}`
		: defaultOptionTypeId
			? `/admin/variant-option-values?optionTypeId=${defaultOptionTypeId}`
			: "/admin/variant-option-values";

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="max-w-md"
		>
			<FieldGroup>
				<FieldSet>
					<FieldLegend>Identification</FieldLegend>
					<form.Field name="optionTypeId">
						{(field) => {
							const isInvalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Option type</FieldLabel>
									{/* Conditionally spread `value` (ADR 0030 floor) — `field.state.value`
									 is `string | undefined` (unselected), but `Select`'s own `value?`
									 prop type has no explicit `| undefined`.
									 NOT swapped to `@colidevs/ui`'s `SelectField` — checked its real
									 signature (`framework/packages/ui/src/form-fields.tsx`): it has no
									 `disabled` prop at all, and this field must stay disabled once
									 editing (`optionTypeId` is immutable after creation). Forcing the
									 swap would silently drop that behavior. */}
									<Select
										{...(field.state.value ? { value: field.state.value } : {})}
										onValueChange={field.handleChange}
										disabled={Boolean(optionValue)}
									>
										<SelectTrigger
											id={field.name}
											className="w-full"
											aria-invalid={isInvalid}
										>
											<SelectValue placeholder="Select an option type" />
										</SelectTrigger>
										<SelectContent>
											{optionTypes.map((type) => (
												<SelectItem key={type.id} value={type.id}>
													{type.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid ? (
										<FieldError>
											{fieldErrorMessage(field.state.meta.errors)}
										</FieldError>
									) : null}
								</Field>
							);
						}}
					</form.Field>
					<form.Field
						name="value"
						validators={{ onChange: variantOptionValueFormSchema.shape.value }}
					>
						{(field) => {
							const isInvalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Value</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
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
				</FieldSet>

				<FieldSet>
					<FieldLegend>Media</FieldLegend>
					<form.Field
						name="imageUrl"
						// `.unwrap()` — see `modules/products/form.tsx`'s identical comment on
						// `coverImage`: the field's own value type is always `string`.
						validators={{
							onChange: variantOptionValueFormSchema.shape.imageUrl.unwrap(),
						}}
					>
						{(field) => {
							const isInvalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Image URL</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
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
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
							</Field>
						)}
					</form.Field>
				</FieldSet>

				<FieldSet>
					<FieldLegend>Display</FieldLegend>
					{/* `@colidevs/ui`'s `NumberStepperField` derives its id from `field.name`
					 (no hardcoded-id collision risk, unlike `CheckboxField`/`SelectField`
					 above) — safe to adopt regardless of how many numeric fields a form
					 has. */}
					<form.Field name="displayOrder">
						{(field) => (
							<NumberStepperField field={field} title="Display order" />
						)}
					</form.Field>

					{optionValue ? (
						<form.Field name="isActive">
							{(field) => <SwitchField field={field} title="Active" />}
						</form.Field>
					) : null}
				</FieldSet>

				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push(redirectTo)}
					>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isPending || isSubmitting}>
								{isPending
									? "Saving…"
									: optionValue
										? "Save changes"
										: "Create"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}
