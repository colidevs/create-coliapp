import { HttpResponse, http } from "msw";

import { categoriesFixture } from "@/mocks/data/categories";
import { type ProductRecord, productsFixture } from "@/mocks/data/products";

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

/**
 * `sdd/ecommerce-product-variants/design`, Phase 7 — a minimal, LOCAL
 * `variants[]` fixture for the storefront's own `PublicProduct` response
 * shape. Deliberately NOT a new shared `mocks/data/variants.ts` module: that
 * file is Phase 9's own task (9.3, full admin+storefront fixture/handler
 * overhaul across `admin.ts`/`storefront.ts` alike) — this stays scoped to
 * exactly what the storefront read endpoints and `e2e/checkout-flow.spec.ts`
 * need today, without pre-empting that later, broader fixture design.
 * `admin.ts`'s own `productsFixture`/`ProductRecord` (flat `price`/`stock`)
 * is untouched — this only PROJECTS it into the variants shape, locally,
 * for the two `web/products` read handlers below.
 *
 * "Oak Dining Chair" gets two real variants (a `Finish` option with two
 * values, one of them out of stock) so the storefront's
 * `<VariantSelector>`/`resolveVariant` matching logic is genuinely exercised
 * end to end, not just rendered with an empty option list.
 */
function toPublicVariants(product: ProductRecord) {
	if (product.slug === "oak-dining-chair") {
		return [
			{
				id: `${product.id}-natural`,
				price: product.price,
				stock: product.stock,
				isDefault: true,
				options: [
					{
						optionTypeSlug: "finish",
						optionTypeName: "Finish",
						valueSlug: "natural",
						value: "Natural",
						imageUrl: null,
						description: null,
					},
				],
			},
			{
				id: `${product.id}-walnut`,
				price: product.price + 20,
				stock: 0,
				isDefault: false,
				options: [
					{
						optionTypeSlug: "finish",
						optionTypeName: "Finish",
						valueSlug: "walnut",
						value: "Walnut",
						imageUrl: null,
						description: null,
					},
				],
			},
		];
	}

	return [
		{
			id: `${product.id}-default`,
			price: product.price,
			stock: product.stock,
			isDefault: true,
			options: [],
		},
	];
}

function toPublicProduct(product: ProductRecord) {
	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		description: product.description,
		coverImage: product.coverImage,
		categoryId: product.categoryId,
		variants: toPublicVariants(product),
	};
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
		const items = filtered.slice(start, start + size).map(toPublicProduct);

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

		return HttpResponse.json(toPublicProduct(product), { status: 200 });
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
