"use client";

import { Field, FieldError, FieldGroup, FieldLabel } from "@colidevs/ui/field";
import { SwitchField } from "@colidevs/ui/form-fields";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 *
 * **Structure pass (munod parity, hefesto `design-to-code`)**: grouping now
 * uses `@colidevs/ui`'s `FieldGroup` (no card chrome, pure flex/gap
 * grouping) instead of a bare `space-y-4` div. `name` composes
 * `Field`/`FieldLabel`/`FieldError` instead of a `space-y-1` div + `<Label>`
 * + ad hoc `<p>`. Button order fixed to munod's outline-then-primary,
 * left-to-right convention: "Cancel" now comes before "Create"/"Save
 * changes", not after.
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
			className="max-w-md"
		>
			<FieldGroup>
				<form.Field
					name="name"
					validators={{ onChange: categoryFormSchema.shape.name }}
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

				{category ? (
					<form.Field name="isActive">
						{(field) => <SwitchField field={field} title="Active" />}
					</form.Field>
				) : null}

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
								{isPending ? "Saving…" : category ? "Save changes" : "Create"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}
