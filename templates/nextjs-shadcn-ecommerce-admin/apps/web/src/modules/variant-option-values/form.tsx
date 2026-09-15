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
			className="max-w-md space-y-4"
		>
			<form.Field name="optionTypeId">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Option type</Label>
						{/* Conditionally spread `value` (ADR 0030 floor) — `field.state.value`
						 is `string | undefined` (unselected), but `Select`'s own `value?`
						 prop type has no explicit `| undefined`. */}
						<Select
							{...(field.state.value ? { value: field.state.value } : {})}
							onValueChange={field.handleChange}
							disabled={Boolean(optionValue)}
						>
							<SelectTrigger id={field.name} className="w-full">
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
						{field.state.meta.errors.length > 0 ? (
							<p className="text-destructive text-sm">
								{fieldErrorMessage(field.state.meta.errors)}
							</p>
						) : null}
					</div>
				)}
			</form.Field>
			<form.Field
				name="value"
				validators={{ onChange: variantOptionValueFormSchema.shape.value }}
			>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Value</Label>
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
				name="imageUrl"
				// `.unwrap()` — see `modules/products/form.tsx`'s identical comment on
				// `coverImage`: the field's own value type is always `string`.
				validators={{
					onChange: variantOptionValueFormSchema.shape.imageUrl.unwrap(),
				}}
			>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Image URL</Label>
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
			<form.Field name="description">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Description</Label>
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
			<form.Field name="displayOrder">
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Display order</Label>
						<Input
							id={field.name}
							name={field.name}
							type="number"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) =>
								field.handleChange(event.target.valueAsNumber)
							}
						/>
					</div>
				)}
			</form.Field>

			{optionValue ? (
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
							{isPending ? "Saving…" : optionValue ? "Save changes" : "Create"}
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
