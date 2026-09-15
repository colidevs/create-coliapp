"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import {
	createVariantOptionTypeAction,
	updateVariantOptionTypeAction,
} from "./actions";
import {
	type VariantOptionType,
	type VariantOptionTypeFormValues,
	variantOptionTypeFormSchema,
} from "./types";

/**
 * Structural port of `modules/categories/form.tsx` — same `@tanstack/
 * react-form` + `toActionState` shape (`colidevs/hefesto#104`, correcting
 * `console-golden-path.md` decision 5's prior React Hook Form pick). `slug`
 * is never a form field: it is derived server-side from `name` on both
 * create and rename (design: "`slug` is derived from `name`"/"Renaming
 * re-derives `slug`").
 */
export function VariantOptionTypeForm({
	optionType,
	onSuccess,
	redirectTo = "/admin/variant-option-types",
}: {
	optionType?: VariantOptionType;
	onSuccess?: () => void;
	redirectTo?: string;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			name: optionType?.name ?? "",
			displayOrder: optionType?.displayOrder ?? 0,
			isActive: optionType?.isActive ?? true,
		} satisfies VariantOptionTypeFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			// Conditionally include `displayOrder` (ADR 0030's
			// `exactOptionalPropertyTypes` floor rejects `displayOrder: undefined`
			// against `VariantOptionTypeCreate`/`VariantOptionTypeUpdate`'s
			// optional, non-explicit-undefined field).
			const result = optionType
				? await updateVariantOptionTypeAction(optionType.id, {
						name: values.name,
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
						isActive: values.isActive,
					})
				: await createVariantOptionTypeAction({
						name: values.name,
						...(values.displayOrder !== undefined
							? { displayOrder: values.displayOrder }
							: {}),
					});

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(
							field as keyof VariantOptionTypeFormValues,
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

			toast.success(
				optionType ? "Option type updated." : "Option type created.",
			);
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({
				queryKey: ["variant-option-types"],
			});
			onSuccess?.();
			router.push(redirectTo);
		},
	});

	return (
		<form
			id="variant-option-type-form"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="max-w-md space-y-4"
		>
			<form.Field
				name="name"
				validators={{ onChange: variantOptionTypeFormSchema.shape.name }}
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

			{optionType ? (
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
							{isPending ? "Saving…" : optionType ? "Save changes" : "Create"}
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
