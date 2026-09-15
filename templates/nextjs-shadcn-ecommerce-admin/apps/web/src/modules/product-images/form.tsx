"use client";

import { Field, FieldError, FieldGroup, FieldLabel } from "@colidevs/ui/field";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getQueryClient } from "@/lib/query";
import { fieldErrorMessage } from "@/lib/utils";
import { createProductImageAction, updateProductImageAction } from "./actions";
import {
	type ProductImage,
	type ProductImageFormValues,
	productImageFormSchema,
} from "./types";

/**
 * This template ships `product-images` as a standalone CRUD entity (design's
 * own directory tree), unlike munod — where images are managed inline
 * inside `products/form.tsx`'s minio-upload gallery field (no standalone
 * admin page exists there at all). `url` is a plain string field here (no
 * upload — this template has no MinIO wiring), matching `products/form.tsx`'s
 * own `coverImage` field. Built on `@tanstack/react-form`
 * (`colidevs/hefesto#104`, correcting `console-golden-path.md` decision 5's
 * prior React Hook Form pick).
 *
 * **Structure pass (munod parity, hefesto `design-to-code`)**: grouping now
 * uses `@colidevs/ui`'s `FieldGroup` instead of a bare `space-y-4` div; all
 * three fields compose `Field`/`FieldLabel`/`FieldError` instead of a
 * `space-y-1` div + `<Label>` + ad hoc `<p>`. Button order fixed to
 * outline-then-primary. `@colidevs/ui`'s `NumberStepperField` adoption for
 * `position` is a separate, already-in-flight concern
 * (`sdd/ecommerce-product-variants/apply-progress` PR18) — not swapped in
 * as part of this structure-only pass.
 */
export function ProductImageForm({
	image,
	defaultProductId,
}: {
	image?: ProductImage;
	// Explicit `| undefined` (ADR 0030 floor) — the `add/page.tsx` caller
	// derives this from `await searchParams`, a genuine `string | undefined`.
	defaultProductId?: string | undefined;
}) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			productId: image?.productId ?? defaultProductId ?? "",
			url: image?.url ?? "",
			position: image?.position ?? 0,
		} satisfies ProductImageFormValues,
		onSubmit: async ({ value: values }) => {
			setIsPending(true);

			// Conditionally include `position` (ADR 0030's `exactOptionalPropertyTypes`
			// floor rejects `position: undefined` against `ProductImageUpdate`/
			// `ProductImageCreate`'s optional, non-explicit-undefined `position?`).
			const result = image
				? await updateProductImageAction(image.id, {
						url: values.url,
						...(values.position !== undefined
							? { position: values.position }
							: {}),
					})
				: await createProductImageAction({
						productId: values.productId,
						url: values.url,
						...(values.position !== undefined
							? { position: values.position }
							: {}),
					});

			setIsPending(false);

			if (!result.success) {
				if (result.errors) {
					for (const [field, messages] of Object.entries(result.errors)) {
						form.setFieldMeta(
							field as keyof ProductImageFormValues,
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

			toast.success(image ? "Image updated." : "Image created.");
			// See `modules/products/form.tsx`'s identical comment — the browser
			// `QueryClient` singleton's global `staleTime: 60_000` (`lib/query.ts`)
			// otherwise serves this list's pre-write cached page for up to a
			// minute after this `router.push()`.
			getQueryClient().invalidateQueries({ queryKey: ["product-images"] });
			router.push("/admin/product-images");
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
				<form.Field
					name="productId"
					validators={{ onChange: productImageFormSchema.shape.productId }}
				>
					{(field) => {
						const isInvalid = field.state.meta.errors.length > 0;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Product ID</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									disabled={Boolean(image)}
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
					name="url"
					validators={{ onChange: productImageFormSchema.shape.url }}
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
				<form.Field name="position">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>Position</FieldLabel>
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
						</Field>
					)}
				</form.Field>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/admin/product-images")}
					>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isPending || isSubmitting}>
								{isPending ? "Saving…" : image ? "Save changes" : "Create"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</FieldGroup>
		</form>
	);
}
