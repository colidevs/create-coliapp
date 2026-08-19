"use client";

import { Button, Dialog } from "@cloudflare/kumo";
import { useActionState, useEffect, useRef } from "react";

import {
	initialOrderActionState,
	type OrderActionState,
} from "@/app/(console)/orders/action-state";
import { deleteOrderAction } from "@/app/(console)/orders/actions";
import type { Order } from "@/generated/orders/model";

/**
 * Compound `Dialog.*` leaf (task 3.6) — a destructive-action confirmation,
 * `role="alertdialog"` per Kumo's own Dialog-vs-AlertDialog guidance. Wired
 * to `deleteOrderAction` (bound to `order.id`) via `useActionState`, same
 * pattern as `order-form-dialog.client.tsx`.
 */
export interface DeleteOrderDialogProps {
	order: Order | undefined;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function DeleteOrderDialog({
	order,
	onOpenChange,
	onSuccess,
}: DeleteOrderDialogProps) {
	const action = order
		? deleteOrderAction.bind(null, order.id)
		: async (state: OrderActionState) => state;

	const [state, formAction, isPending] = useActionState<
		OrderActionState,
		FormData
	>(action, initialOrderActionState);

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

	return (
		<Dialog.Root
			role="alertdialog"
			open={order !== undefined}
			onOpenChange={onOpenChange}
		>
			<Dialog className="p-8">
				<Dialog.Title className="text-xl font-semibold">
					Delete order?
				</Dialog.Title>
				<Dialog.Description className="text-kumo-subtle">
					{order
						? `This will permanently delete "${order.name}". This action cannot be undone.`
						: null}
				</Dialog.Description>
				{state.message && (
					<p className="text-kumo-danger mt-2 text-sm">{state.message}</p>
				)}
				<form action={formAction} className="mt-6 flex justify-end gap-2">
					<Dialog.Close
						render={(props) => (
							<Button variant="secondary" {...props}>
								Cancel
							</Button>
						)}
					/>
					<Button type="submit" variant="destructive" disabled={isPending}>
						Delete
					</Button>
				</form>
			</Dialog>
		</Dialog.Root>
	);
}
