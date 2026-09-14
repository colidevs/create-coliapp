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
import { createCategoryAction, updateCategoryAction } from "./actions";
import {
	type Category,
	type CategoryFormValues,
	categoryFormSchema,
} from "./types";

/**
 * NOT a port of munod's `@tanstack/react-form`-based `form.tsx` — this
 * template's forms use React Hook Form + `zodResolver`
 * (`console-golden-path.md` decision 5), the same pattern the storefront
 * checkout form already established (task 6.3). `problemToActionState`
 * (via `@/lib/problem`'s adapter, `./actions.ts`) feeds RHF's own
 * `setError`, composing client-side validation with the server's
 * authoritative result exactly as that decision describes.
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

	const {
		register,
		handleSubmit,
		setError,
		control,
		formState: { errors },
	} = useForm<CategoryFormValues>({
		resolver: zodResolver(categoryFormSchema),
		defaultValues: {
			name: category?.name ?? "",
			isActive: category?.isActive ?? true,
		},
	});

	async function onSubmit(values: CategoryFormValues) {
		setIsPending(true);

		const result = category
			? await updateCategoryAction(category.id, values)
			: await createCategoryAction(values);

		setIsPending(false);

		if (!result.success) {
			if (result.errors) {
				for (const [field, messages] of Object.entries(result.errors)) {
					setError(field as keyof CategoryFormValues, {
						type: "server",
						message: messages[0] ?? "Invalid value",
					});
				}
			}
			if (result.message) toast.error(result.message);
			return;
		}

		toast.success(category ? "Category updated." : "Category created.");
		onSuccess?.();
		router.push(redirectTo);
	}

	return (
		<form
			id="category-form"
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

			{category ? (
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
					{isPending ? "Saving…" : category ? "Save changes" : "Create"}
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
