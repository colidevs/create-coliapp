import type { RawBodyRequest } from "@colidevs/api-kit/webhooks/express";
import type { Request, Response } from "express";
import { config } from "@/config";
import { warn } from "@/lib/logger";
import { WebhookSignatureHttpError } from "@/v1/res/errors";
import type { Service } from "./service";
import { verifyDlocalSignature } from "./signature";
import { CheckoutRequestSchema, DlocalNotificationSchema } from "./types";

export interface Controller {
	createCheckout: (req: Request, res: Response) => Promise<Response>;
	handleNotification: (req: RawBodyRequest, res: Response) => Promise<Response>;
}

function controller(svc: Service): Controller {
	const createCheckout: Controller["createCheckout"] = async (req, res) => {
		const data = CheckoutRequestSchema.parse(req.body);

		const result = await svc.createCheckout(data);

		return res.status(200).json(result);
	};

	/**
	 * @description Mounted via `dlocalNotificationRouter`
	 * (`./route.ts`), directly on the top-level `api` app in `src/api.ts` —
	 * BEFORE the global `express.json()` call, so `req.body` is never
	 * populated here. `req.rawBody` (populated by `rawBodyCapture()`, see
	 * `./route.ts`) is this handler's only source of the request body, both
	 * for signature verification AND for the parsed notification payload.
	 */
	const handleNotification: Controller["handleNotification"] = async (
		req,
		res,
	) => {
		const isValid = verifyDlocalSignature(
			{
				headerName: "authorization",
				scheme: "V2-HMAC-SHA256, Signature: ",
				digest: "hex",
				buildSigningPayload: (apiKey, rawBody) => apiKey + rawBody.toString(),
				secret: config.dlocal.apiSecret,
				apiKey: config.dlocal.apiKey,
			},
			req.rawBody,
			req.headers,
		);

		if (!isValid) {
			warn(`ip ${req.ip} — dlocal notification invalid signature`);
			throw new WebhookSignatureHttpError();
		}

		const parsedBody = req.rawBody
			? JSON.parse(req.rawBody.toString("utf8"))
			: {};
		const { payment_id: paymentId } =
			DlocalNotificationSchema.parse(parsedBody);

		const result = await svc.handleNotification(paymentId);

		return res.status(200).json(result);
	};

	return {
		createCheckout,
		handleNotification,
	};
}

export { controller as createDlocalController };
