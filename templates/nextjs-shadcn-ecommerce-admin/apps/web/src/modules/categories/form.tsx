"use client";

import { CheckboxField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import { createCategoryAction, updateCategoryAction } from "./actions";
import {
	type Category,
	type CategoryFormValues,
	categoryFormSchema,
} from "./types";

/**
 * NOT a port of munod's `@tanstack/react-form`-based `form.tsx` in its full
 * shape — this module keeps its own minimal field set (`ProductCreate`/
 * `ProductUpdate` here has no dimensions/tags/discount fields), but IS now
 * built on the same real, colidevs-production binding library, TanStack
 * Form (`colidevs/hefesto#104` — ADR 0001 Decision 5 was corrected: real
 * production code, `munod` and `org-jaulasvacias`, never used React Hook
 * Form). `toActionState` (via `@/lib/problem`'s adapter, `./actions.ts`)
 * feeds a per-field `errorMap.onSubmit`, composing client-side validation
 * with the server's authoritative result exactly as `console-golden-path.md`
 * describes, unchanged by this migration.
 *
 * **`@colidevs/ui` adoption**: `isActive` now uses the shared `CheckboxField`
 * composed-form-fields layer (`sdd/ecommerce-product-variants/apply-progress`
 * PR18) — safe here since this page has exactly one checkbox instance (see
 * `modules/variant-option-values/form.tsx`'s note on the hardcoded-id
 * constraint this relies on).
 */
export function CategoryForm({
	category,
	onSuccess,
	redirectTo = "/admin/categories",
}: {
	category?: Category;
	onSuccess?: () => void;
	redirectTo?: string;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			name: category?.name ?? "",
			isActive: category?.isActive ?? true,
		} satisfies CategoryFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			const result = category
				? await updateCategoryAction(category.id, values)
				: await createCategoryAction(values);

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(field as keyof CategoryFormValues, (meta) => ({
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

			toast.success(category ? "Category updated." : "Category created.");
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({ queryKey: ["categories"] });
			onSuccess?.();
			router.push(redirectTo);
		},
	});

	return (
		<form
			id="category-form"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="max-w-md space-y-4"
		>
			<form.Field
				name="name"
				validators={{ onChange: categoryFormSchema.shape.name }}
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

			{category ? (
				<form.Field name="isActive">
					{(field) => <CheckboxField field={field} title="Active" />}
				</form.Field>
			) : null}

			<div className="flex gap-2">
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isPending || isSubmitting}>
							{isPending ? "Saving…" : category ? "Save changes" : "Create"}
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
