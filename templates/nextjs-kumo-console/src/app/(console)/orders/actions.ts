"use server";

import { problemToActionState } from "@colidevs/utils";
import { revalidatePath } from "next/cache";

import {
	createOrder,
	deleteOrder,
	updateOrder,
} from "@/generated/orders/endpoints/orders/orders";
import type { Problem } from "@/generated/orders/model";
import type { OrderActionState } from "./action-state";

/**
 * Server Actions for the orders module's mutations (task 3.3,
 * `kumo-console-template` Phase 3). Every error response is mapped through
 * `@colidevs/utils`'s `problemToActionState` (console-golden-path.md) before
 * it ever reaches `useActionState` on a client leaf
 * (`src/components/orders/*.client.tsx`) — this is the one, shared
 * conversion step between the API's RFC 9457 error contract and
 * `useActionState`'s own `{ errors: Record<string, string[]> }` reducer
 * shape (the "Validation error shaping" spec scenario).
 *
 * `@colidevs/utils` import stays here, server-side only (task 3.7) — never
 * imported from a `"use client"` file, which is what keeps its `xlsx`
 * transitive dependency out of the browser bundle (design decision D4).
 *
 * `OrderActionState`/`initialOrderActionState` live in `./action-state.ts`,
 * not here (Phase 4 fix — see that file's own doc comment): a `"use
 * server"` module may only export async functions at its top level, and the
 * plain-object `initialOrderActionState` broke that rule.
 */
export type { OrderActionState } from "./action-state";

export async function createOrderAction(
	_prevState: OrderActionState,
	formData: FormData,
): Promise<OrderActionState> {
	const name = formData.get("name");

	const result = await createOrder({
		name: typeof name === "string" ? name : "",
	});

	if (result.status !== 201) {
		return problemToActionState(result.data as Problem);
	}

	revalidatePath("/orders");
	return { success: true };
}

export async function updateOrderAction(
	orderId: string,
	_prevState: OrderActionState,
	formData: FormData,
): Promise<OrderActionState> {
	const name = formData.get("name");

	const result = await updateOrder(orderId, {
		name: typeof name === "string" ? name : undefined,
	});

	if (result.status !== 200) {
		return problemToActionState(result.data as Problem);
	}

	revalidatePath("/orders");
	return { success: true };
}

export async function deleteOrderAction(
	orderId: string,
	_prevState: OrderActionState,
	_formData: FormData,
): Promise<OrderActionState> {
	const result = await deleteOrder(orderId);

	if (result.status !== 204) {
		return problemToActionState(result.data as Problem);
	}

	revalidatePath("/orders");
	return { success: true };
}
