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
import type { VariantOptionType, VariantOptionValue } from "@/generated/model";
import { getQueryClient } from "@/lib/query";
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
 * **Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11)**: this
 * form now DOES enforce that, once the product has established real option
 * types via sibling variants (`requiredOptionTypeIds`, computed by the
 * calling `add`/`update` page) — a variant left with zero (or a mismatched)
 * selection silently became unreachable on the storefront (`variant-
 * selection.ts#resolveVariant`'s every/some predicate can never match a
 * candidate whose own `options` is empty once any option key is selected).
 * This is advisory, immediate UX feedback only; `apps/api`'s own
 * `admin/variants/repository.ts#assertOptionSelectionsSatisfyProduct` is the
 * real, server-side enforcement (`variant_option_selections`'s composite-PK
 * join itself still carries no DB-level constraint for this).
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

	const {
		register,
		handleSubmit,
		setError,
		control,
		formState: { errors },
	} = useForm<VariantFormValues>({
		resolver: zodResolver(variantFormSchema),
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

	async function onSubmit(values: VariantFormValues) {
		// Bug fix (`sdd/ecommerce-product-variants/apply-progress` PR11):
		// immediate UX feedback BEFORE ever calling the server action — the
		// real enforcement still happens server-side regardless of this check.
		const missingTypeIds = computeMissingRequiredOptionTypes(
			requiredOptionTypeIds,
			values.optionValueIds,
			optionValues,
		);
		if (missingTypeIds.length > 0) {
			const names = missingTypeIds
				.map(
					(typeId) => optionTypes.find((t) => t.id === typeId)?.name ?? typeId,
				)
				.join(", ");
			setError("optionValueIds", {
				type: "manual",
				message: `Select exactly one value for: ${names} — this product already uses ${missingTypeIds.length === 1 ? "that option type" : "these option types"}.`,
			});
			return;
		}

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
					setError(field as keyof VariantFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
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
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1">
					<Label htmlFor="productId">Product ID</Label>
					<Input
						id="productId"
						{...register("productId")}
						disabled={Boolean(variant) || Boolean(defaultProductId)}
					/>
					{errors.productId ? (
						<p className="text-destructive text-sm">
							{errors.productId.message}
						</p>
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
					<Label htmlFor="displayOrder">Display order</Label>
					<Input
						id="displayOrder"
						type="number"
						{...register("displayOrder", { valueAsNumber: true })}
					/>
				</div>
			</div>

			<Controller
				name="isDefault"
				control={control}
				render={({ field }) => (
					<div className="flex items-center gap-2">
						<Checkbox
							id="isDefault"
							checked={field.value}
							onCheckedChange={(checked) => field.onChange(checked === true)}
						/>
						<Label htmlFor="isDefault">Default variant</Label>
					</div>
				)}
			/>

			{variant ? (
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

			{groupedOptions.length > 0 ? (
				<Controller
					name="optionValueIds"
					control={control}
					render={({ field }) => (
						<div className="space-y-3">
							<Label>Options</Label>
							{groupedOptions.map(({ type, values }) => (
								<div key={type.id} className="space-y-1">
									<p className="text-muted-foreground text-sm">{type.name}</p>
									<div className="flex flex-wrap gap-4">
										{values.map((value) => {
											const checked = field.value.includes(value.id);
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
															field.onChange(
																next === true
																	? [...field.value, value.id]
																	: field.value.filter((id) => id !== value.id),
															);
														}}
													/>
													<Label htmlFor={inputId}>{value.value}</Label>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					)}
				/>
			) : (
				<p className="text-muted-foreground text-sm">
					No option values are available yet — create an option type and its
					values first (Option types).
				</p>
			)}
			{errors.optionValueIds ? (
				<p className="text-destructive text-sm">
					{errors.optionValueIds.message}
				</p>
			) : null}

			<div className="flex gap-2">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving…" : variant ? "Save changes" : "Create"}
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
