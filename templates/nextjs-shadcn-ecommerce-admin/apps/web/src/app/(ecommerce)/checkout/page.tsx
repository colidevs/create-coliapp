"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Price } from "@/lib/currency";
import { fieldErrorMessage } from "@/lib/utils";
import { useCartStore } from "@/modules/cart/store";
import { submitCheckout } from "./actions";

/**
 * NOT a port of munod's real `app/(ecommerce)/checkout/page.tsx` — that page
 * is a fake/mocked card-entry form (a hardcoded 2-second `setTimeout`, a
 * `toast` showing the submitted JSON, no real API call at all) that never
 * calls munod's own `dlocal-checkout` backend and is Ecuador-specific
 * (province list, cédula/RUC regex). This template's checkout is new,
 * wired against the real `POST /api/v1/dlocal/checkout` contract (PR3a's
 * `CheckoutRequest`/`CheckoutResponse`, `@/generated/model`). Client-side
 * validation is `@tanstack/react-form` (`colidevs/hefesto#104`, correcting
 * `console-golden-path.md` decision 5's prior React Hook Form pick) layered
 * on top of — never a substitute for — the Server Action's own authoritative
 * call.
 */
const payerSchema = z.object({
	name: z.string().min(1, "Required"),
	email: z.email("Invalid email"),
	document: z.string().min(1, "Required"),
	phone: z.string().optional(),
});

type PayerFormValues = z.infer<typeof payerSchema>;

export default function CheckoutPage() {
	const router = useRouter();
	const { items } = useCartStore();
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			document: "",
			phone: "",
		} satisfies PayerFormValues,
		onSubmit: async ({ value: payer }) => {
			setIsPending(true);
			setError(null);

			// `exactOptionalPropertyTypes` (ADR 0030) rejects an explicit `undefined`
			// for `phone?: string` — conditionally spread instead of always
			// assigning the key.
			const { phone, ...requiredFields } = payer;
			const result = await submitCheckout(
				{ ...requiredFields, ...(phone ? { phone } : {}) },
				items.map((item) => ({
					variantId: item.variantId,
					quantity: item.quantity,
				})),
			);

			// A successful call redirects server-side (`actions.ts`'s `redirect()`)
			// and never returns — this branch only runs on the error path.
			if (result?.error) {
				setError(result.error);
				setIsPending(false);
			}
		},
	});

	const totalPrice = items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);

	if (items.length === 0) {
		return (
			<div className="mx-auto max-w-md px-4 py-24 text-center">
				<p className="text-muted-foreground">Your cart is empty.</p>
				<Button className="mt-4" onClick={() => router.push("/products")}>
					Browse products
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-md px-4 py-12">
			<h1 className="mb-6 font-semibold text-2xl">Checkout</h1>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Field
					name="name"
					validators={{ onChange: payerSchema.shape.name }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Full name</Label>
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
					name="email"
					validators={{ onChange: payerSchema.shape.email }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Email</Label>
							<Input
								id={field.name}
								name={field.name}
								type="email"
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
					name="document"
					validators={{ onChange: payerSchema.shape.document }}
				>
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Document</Label>
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
				<form.Field name="phone">
					{(field) => (
						<div className="space-y-1">
							<Label htmlFor={field.name}>Phone (optional)</Label>
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

				<div className="flex items-center justify-between border-t pt-4 font-medium">
					<span>Total</span>
					<Price price={totalPrice} />
				</div>

				{error ? <p className="text-destructive text-sm">{error}</p> : null}

				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							disabled={isPending || isSubmitting}
							className="w-full"
						>
							{isPending ? "Redirecting to payment…" : "Pay with dLocal"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
