import { HttpResponse, http } from "msw";

import { categoriesFixture } from "@/mocks/data/categories";
import { productsFixture } from "@/mocks/data/products";

/**
 * Phase 6's own MSW handler set for the storefront's public read endpoints
 * plus the mocked dLocal checkout call — kept out of `src/mocks/handlers.ts`
 * (that file's own doc comment: hand-written fixtures live per-module,
 * alongside the page that consumes them, matching `nextjs-kumo-console`'s
 * `src/mocks/handlers/orders.ts` precedent) and composed into
 * `src/mocks/node.ts`.
 *
 * The mocked `POST /api/v1/dlocal/checkout` deliberately returns a
 * `redirectUrl` pointing back at THIS app's own `/checkout/return` route
 * (same origin as the incoming request) rather than any real
 * `dlocalgo.com` URL — this is what lets the Playwright E2E spec
 * (`e2e/checkout-flow.spec.ts`) exercise the full browse → cart → checkout
 * → return flow without ever leaving `localhost` or depending on a real
 * dLocal sandbox.
 */
function problem(status: number, title: string, detail?: string) {
	return HttpResponse.json(
		{ type: "about:blank", status, title, ...(detail ? { detail } : {}) },
		{ status },
	);
}

export const storefrontHandlers = [
	http.get("*/api/v1/web/categories", () => {
		return HttpResponse.json(categoriesFixture, { status: 200 });
	}),

	http.get("*/api/v1/web/products", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "1") || 1;
		const size = Number(url.searchParams.get("size") ?? "20") || 20;
		const categoryId = url.searchParams.get("categoryId") ?? undefined;
		const q = url.searchParams.get("q")?.toLowerCase();

		const filtered = productsFixture.filter((product) => {
			if (!product.isActive) return false;
			if (categoryId && product.categoryId !== categoryId) return false;
			if (q && !product.name.toLowerCase().includes(q)) return false;
			return true;
		});

		const start = (page - 1) * size;
		const items = filtered.slice(start, start + size);

		return HttpResponse.json(
			{
				items,
				pagination: {
					page,
					size,
					total: filtered.length,
					count: items.length,
					next: start + size < filtered.length ? page + 1 : page,
					previous: page > 1 ? page - 1 : page,
				},
			},
			{ status: 200 },
		);
	}),

	http.get("*/api/v1/web/products/:slug", ({ params }) => {
		const product = productsFixture.find(
			(item) => item.slug === params.slug && item.isActive,
		);

		if (!product) {
			return problem(404, "Not Found", "Product not found.");
		}

		return HttpResponse.json(product, { status: 200 });
	}),

	http.post("*/api/v1/dlocal/checkout", async ({ request }) => {
		const body = (await request.json().catch(() => null)) as {
			orderId?: unknown;
			items?: unknown;
		} | null;

		if (!body?.orderId || !Array.isArray(body.items) || !body.items.length) {
			return problem(
				422,
				"Unprocessable Entity",
				"orderId and at least one item are required.",
			);
		}

		const origin = new URL(request.url).origin;

		return HttpResponse.json(
			{
				orderId: body.orderId,
				dlocalId: `D-4-mock-${body.orderId}`,
				status: "PENDING",
				redirectUrl: `${origin}/checkout/return`,
			},
			{ status: 200 },
		);
	}),
];
