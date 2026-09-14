import { info } from "@/lib/logger";
import { NotFoundHttpError } from "@/v1/res/errors";
import type { Repository } from "./repository";
import type { CheckoutRequest, CheckoutResponse } from "./types";

export interface Service {
	createCheckout: (data: CheckoutRequest) => Promise<CheckoutResponse>;
	handleNotification: (paymentId: string) => Promise<{ status: string }>;
}

/**
 * @description Thin orchestration layer over `Repository` — this template's
 * repositories throw the shared `HttpError` subclasses directly
 * (`src/v1/res/errors.ts`, design decision (a)), so this layer does no
 * error-translation of its own (unlike munod's `RepositoryError` → `HttpError`
 * indirection, which existed only because munod's response shape wasn't RFC
 * 9457). Its job is assembling request/response shapes and sequencing calls.
 */
function dlocalService(repo: Repository): Service {
	async function createCheckout(
		data: CheckoutRequest,
	): ReturnType<Service["createCheckout"]> {
		const existing = await repo.getOrderByOrderId(data.orderId);

		if (existing?.dlocalId) {
			return replayExistingCheckout(repo, existing.orderId, existing.dlocalId);
		}

		const { orderItems, amount } = await repo.priceAndValidateItems(data.items);

		const dlocalCheckout = await repo.createDlocalCheckout({
			amount,
			orderId: data.orderId,
			payer: data.payer,
		});

		const order = await repo.createOrder({
			orderId: data.orderId,
			mail: data.payer?.email ?? null,
			buyerInfo: data.payer ?? null,
			buyerProducts: orderItems,
			dlocalId: dlocalCheckout.id,
			status: dlocalCheckout.status,
		});

		// The order that actually won the insert race may differ from the one
		// this call priced/created a dLocal session for (see
		// `repository.ts#createOrder`'s doc comment) — always replay off
		// whichever `dlocalId` is now persisted, never off `dlocalCheckout`
		// directly, so the response is always consistent with the DB.
		if (order.dlocalId === dlocalCheckout.id) {
			return {
				orderId: order.orderId,
				dlocalId: dlocalCheckout.id,
				status: dlocalCheckout.status,
				redirectUrl: dlocalCheckout.redirect_url,
			};
		}

		return replayExistingCheckout(
			repo,
			order.orderId,
			order.dlocalId as string,
		);
	}

	async function handleNotification(
		paymentId: string,
	): ReturnType<Service["handleNotification"]> {
		const payment = await repo.getPayment(paymentId);

		const transitioned = await repo.applyPaymentTransition(
			payment.id,
			payment.status,
		);

		if (!transitioned) {
			const order = await repo.getOrderByDlocalId(payment.id);

			if (!order) {
				throw new NotFoundHttpError(
					`No order found for dlocal payment ${payment.id}`,
				);
			}

			info(
				`order for payment ${payment.id} already at status ${payment.status}, skipping`,
			);

			return { status: payment.status };
		}

		info(`order for payment ${payment.id} updated to status ${payment.status}`);

		return { status: payment.status };
	}

	return { createCheckout, handleNotification };
}

async function replayExistingCheckout(
	repo: Repository,
	orderId: string,
	dlocalId: string,
): Promise<CheckoutResponse> {
	const payment = await repo.getPayment(dlocalId);

	return {
		orderId,
		dlocalId: payment.id,
		status: payment.status,
		redirectUrl: payment.redirect_url,
	};
}

export { dlocalService as createDlocalService };
