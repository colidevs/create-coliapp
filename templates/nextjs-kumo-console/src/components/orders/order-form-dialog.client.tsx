"use client";

import { Button, Dialog, Input } from "@cloudflare/kumo";
import { X } from "@phosphor-icons/react";
import { useActionState, useEffect, useRef } from "react";

import {
	createOrderAction,
	initialOrderActionState,
	type OrderActionState,
	updateOrderAction,
} from "@/app/(console)/orders/actions";
import type { Order } from "@/generated/orders/model";

/**
 * Compound `Dialog.*` leaf (task 3.6) — a create/edit form for one order,
 * wired to the Phase 3.3 Server Actions via `useActionState`. Shared between
 * both modes rather than two near-duplicate components: `mode === "edit"`
 * binds `updateOrderAction` to the given `order.id`
 * (`updateOrderAction.bind(null, order.id)`, Next's documented pattern for
 * passing extra arguments to a `useActionState` action), `mode === "create"`
 * uses `createOrderAction` directly.
 */
export interface OrderFormDialogProps {
	mode: "create" | "edit";
	order?: Order;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function OrderFormDialog({
	mode,
	order,
	open,
	onOpenChange,
	onSuccess,
}: OrderFormDialogProps) {
	const action =
		mode === "edit" && order
			? updateOrderAction.bind(null, order.id)
			: createOrderAction;

	const [state, formAction, isPending] = useActionState<
		OrderActionState,
		FormData
	>(action, initialOrderActionState);

	// Guards against re-firing onSuccess/onOpenChange on every render once
	// `state.success` is set — useActionState keeps returning the same
	// resolved state until the next submission.
	const handledSuccess = useRef(false);

	useEffect(() => {
		if (state.success && !handledSuccess.current) {
			handledSuccess.current = true;
			onSuccess();
			onOpenChange(false);
		} else if (!state.success) {
			handledSuccess.current = false;
		}
	}, [state, onSuccess, onOpenChange]);

	const nameErrors = state.errors?.name;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog className="p-8">
				<div className="mb-4 flex items-start justify-between gap-4">
					<Dialog.Title className="text-xl font-semibold">
						{mode === "create" ? "New order" : "Edit order"}
					</Dialog.Title>
					<Dialog.Close
						aria-label="Close"
						render={(props) => (
							<Button
								{...props}
								variant="secondary"
								shape="square"
								icon={<X />}
								aria-label="Close"
							/>
						)}
					/>
				</div>
				<form action={formAction} className="flex flex-col gap-4">
					<Input
						name="name"
						label="Name"
						defaultValue={order?.name}
						required
						aria-invalid={nameErrors !== undefined}
						description={nameErrors?.join(" ")}
					/>
					{state.message && (
						<p className="text-kumo-danger text-sm">{state.message}</p>
					)}
					<div className="mt-2 flex justify-end gap-2">
						<Dialog.Close
							render={(props) => (
								<Button variant="secondary" {...props}>
									Cancel
								</Button>
							)}
						/>
						<Button type="submit" variant="primary" disabled={isPending}>
							{mode === "create" ? "Create" : "Save"}
						</Button>
					</div>
				</form>
			</Dialog>
		</Dialog.Root>
	);
}
