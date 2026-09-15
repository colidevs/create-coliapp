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
	createVariantOptionTypeAction,
	updateVariantOptionTypeAction,
} from "./actions";
import {
	type VariantOptionType,
	type VariantOptionTypeFormValues,
	variantOptionTypeFormSchema,
} from "./types";

/**
 * Structural port of `modules/categories/form.tsx` — same React Hook Form +
 * `zodResolver` + `problemToActionState` shape (`console-golden-path.md`
 * decision 5). `slug` is never a form field: it is derived server-side from
 * `name` on both create and rename (design: "`slug` is derived from
 * `name`"/"Renaming re-derives `slug`").
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

	const {
		register,
		handleSubmit,
		setError,
		control,
		formState: { errors },
	} = useForm<VariantOptionTypeFormValues>({
		resolver: zodResolver(variantOptionTypeFormSchema),
		defaultValues: {
			name: optionType?.name ?? "",
			displayOrder: optionType?.displayOrder ?? 0,
			isActive: optionType?.isActive ?? true,
		},
	});

	async function onSubmit(values: VariantOptionTypeFormValues) {
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
					setError(field as keyof VariantOptionTypeFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
				}
			}
			if (result.message) toast.error(result.message);
			return;
		}

		toast.success(optionType ? "Option type updated." : "Option type created.");
		// See `modules/products/form.tsx`'s identical comment — the browser
		// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
		// otherwise serves this list's pre-write cached page for up to a
		// minute after this `router.push()`.
		getQueryClient().invalidateQueries({ queryKey: ["variant-option-types"] });
		onSuccess?.();
		router.push(redirectTo);
	}

	return (
		<form
			id="variant-option-type-form"
			onSubmit={handleSubmit(onSubmit)}
			className="max-w-md space-y-4"
		>
			<div className="space-y-1">
				<Label htmlFor="name">Name</Label>
				<Input id="name" {...register("name")} />
				{errors.name ? (
					<p className="text-destructive text-sm">{errors.name.message}</p>
				) : null}
			</div>
			<div className="space-y-1">
				<Label htmlFor="displayOrder">Display order</Label>
				<Input
					id="displayOrder"
					type="number"
					{...register("displayOrder", { valueAsNumber: true })}
				/>
			</div>

			{optionType ? (
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
					{isPending ? "Saving…" : optionType ? "Save changes" : "Create"}
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
