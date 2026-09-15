"use client";

import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@colidevs/ui/field";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import { updateStockAction } from "./actions";
import {
	type Stock,
	type StockUpdateFormValues,
	stockUpdateFormSchema,
} from "./types";

/**
 * NOT a port of munod's `stock/form.tsx` (a `@tanstack/react-form` dialog
 * embedded, single-field STOCK-vs-STOCK_MIN toggle) — both `stock`/
 * `stockMin` fields are edited together on this module's own dedicated
 * `[id]/update` page. Now built on the same real, colidevs-production
 * binding library, `@tanstack/react-form` (`colidevs/hefesto#104`,
 * correcting `console-golden-path.md` decision 5's prior React Hook Form
 * pick).
 *
 * **Structure pass (munod parity, hefesto `design-to-code`)**: grouping now
 * uses `@colidevs/ui`'s `FieldGroup` instead of a bare `space-y-4` div; both
 * fields compose `Field`/`FieldLabel`/`FieldError` instead of a `space-y-1`
 * div + `<Label>` + ad hoc `<p>`. Button order fixed to outline-then-primary.
 * `@colidevs/ui`'s `NumberStepperField` adoption is a separate,
 * already-in-flight concern (`sdd/ecommerce-product-variants/apply-progress`
 * PR18) — not swapped in as part of this structure-only pass.
 *
 * **Grouping pass (PR21)**: both fields now sit inside one `FieldSet` +
 * `FieldLegend` section ("Stock"), matching `modules/variants/form.tsx`'s
 * own "Stock" section wording — this form has a single logical group, so
 * there is exactly one `FieldSet` rather than a split.
 */
export function StockForm({ stock }: { stock: Stock }) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			stock: stock.stock,
			stockMin: stock.stockMin,
		} satisfies StockUpdateFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			const result = await updateStockAction(stock.id, values);

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(field as keyof StockUpdateFormValues, (meta) => ({
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

			toast.success("Stock updated.");
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({ queryKey: ["admin-stock"] });
			router.push("/admin/stock");
		},
	});

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
					<FieldLegend>Stock</FieldLegend>
					<form.Field
						name="stock"
						validators={{ onChange: stockUpdateFormSchema.shape.stock }}
					>
						{(field) => {
							const isInvalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Stock</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="number"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.valueAsNumber)
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
					<form.Field
						name="stockMin"
						validators={{ onChange: stockUpdateFormSchema.shape.stockMin }}
					>
						{(field) => {
							const isInvalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Minimum stock</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="number"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.valueAsNumber)
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
				</FieldSet>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/admin/stock")}
					>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isPending || isSubmitting}>
								{isPending ? "Saving…" : "Save changes"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}
