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
import { getQueryClient } from "@/lib/query";
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
 */
export function VariantOptionValueForm({
	optionValue,
	defaultOptionTypeId,
}: {
	optionValue?: VariantOptionValue;
	// Explicit `| undefined` (ADR 0030 floor) — the `add/page.tsx` caller
	// derives this from `await searchParams`, a genuine `string | undefined`.
	defaultOptionTypeId?: string | undefined;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const {
		register,
		handleSubmit,
		setError,
		control,
		formState: { errors },
	} = useForm<VariantOptionValueFormValues>({
		resolver: zodResolver(variantOptionValueFormSchema),
		defaultValues: {
			optionTypeId: optionValue?.optionTypeId ?? defaultOptionTypeId ?? "",
			value: optionValue?.value ?? "",
			imageUrl: optionValue?.imageUrl ?? "",
			description: optionValue?.description ?? "",
			displayOrder: optionValue?.displayOrder ?? 0,
			isActive: optionValue?.isActive ?? true,
		},
	});

	const redirectTo = optionValue
		? `/admin/variant-option-values?optionTypeId=${optionValue.optionTypeId}`
		: defaultOptionTypeId
			? `/admin/variant-option-values?optionTypeId=${defaultOptionTypeId}`
			: "/admin/variant-option-values";

	async function onSubmit(values: VariantOptionValueFormValues) {
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
					setError(field as keyof VariantOptionValueFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
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
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
			<div className="space-y-1">
				<Label htmlFor="optionTypeId">Option type ID</Label>
				<Input
					id="optionTypeId"
					{...register("optionTypeId")}
					disabled={Boolean(optionValue)}
				/>
				{errors.optionTypeId ? (
					<p className="text-destructive text-sm">
						{errors.optionTypeId.message}
					</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="value">Value</Label>
				<Input id="value" {...register("value")} />
				{errors.value ? (
					<p className="text-destructive text-sm">{errors.value.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="imageUrl">Image URL</Label>
				<Input id="imageUrl" {...register("imageUrl")} />
				{errors.imageUrl ? (
					<p className="text-destructive text-sm">{errors.imageUrl.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="description">Description</Label>
				<Input id="description" {...register("description")} />
			</div>
			<div className="space-y-1">
				<Label htmlFor="displayOrder">Display order</Label>
				<Input
					id="displayOrder"
					type="number"
					{...register("displayOrder", { valueAsNumber: true })}
				/>
			</div>

			{optionValue ? (
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
					{isPending ? "Saving…" : optionValue ? "Save changes" : "Create"}
				</Button>
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
