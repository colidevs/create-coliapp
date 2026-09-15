import { HttpResponse, http } from "msw";

import { MOCK_BEARER_TOKEN, MOCK_SESSION } from "@/mocks/data/auth";
import { defaultCategorySeed } from "@/mocks/data/categories";
import { defaultOrderSeed } from "@/mocks/data/orders";
import { defaultProductImageSeed } from "@/mocks/data/product-images";
import { defaultProductSeed } from "@/mocks/data/products";

/**
 * Hand-written MSW handler set for the ADMIN surface (Phase 7b) — mirrors
 * `handlers/storefront.ts`'s own posture (per-module fixtures, composed into
 * `src/mocks/node.ts`), extended to cover every admin entity
 * (`categories`/`products`/`product-images`/`stock`/`orders`) plus the one
 * server-side auth call the admin route group's own gate depends on
 * (`getServerSession()`'s `GET /api/auth/get-session`).
 *
 * **In-memory, mutable state, reset per process** — module-scope arrays
 * (`categories`/`products`/`productImages`), not `handlers/storefront.ts`'s
 * frozen, read-only fixtures — because this admin surface's own CRUD writes
 * need to actually persist across requests within one `next dev`/E2E run for
 * the flow to be exercisable at all. Never shared with real Drizzle-backed
 * state; a full `next dev` restart (or a fresh MSW-mode Playwright run)
 * resets to the seed.
 *
 * **Known, deliberate scope limit**: `stock` and `orders` never get a
 * create/delete handler here, matching `apps/api`'s own real route tables
 * exactly (`admin/stock/route.ts`: GET/GET-by-id/PATCH only;
 * `admin/orders/route.ts`: GET/GET-by-id only, no write of any kind) — a
 * mock that accepted a POST/DELETE those real routes reject would
 * misrepresent the actual API surface this template ships.
 *
 * **`variantOptionTypes`/`variantOptionValues` (PR8) are seeded EMPTY, not
 * from a `mocks/data/*` fixture module** — deliberately, same posture as
 * PR7's own local `toPublicProduct` projection in `handlers/storefront.ts`:
 * a shared `mocks/data/variant-option-types.ts` fixture is Phase 9's own
 * task 9.3 scope, not pre-empted here. An empty admin-managed vocabulary is
 * also the realistic starting state the spec itself describes ("GIVEN an
 * admin wants a 'flavor' option type... WHEN they create it via the admin
 * UI... THEN it becomes usable... with no deploy or migration").
 */
let categories = defaultCategorySeed();
let products = defaultProductSeed();
let productImages = defaultProductImageSeed();
const orders = defaultOrderSeed();

interface VariantOptionTypeRecord {
	id: string;
	name: string;
	slug: string;
	displayOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface VariantOptionValueRecord {
	id: string;
	optionTypeId: string;
	value: string;
	slug: string;
	imageUrl: string | null;
	description: string | null;
	displayOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

function toSlug(value: string) {
	return value.toLowerCase().replace(/\s+/g, "-");
}

let variantOptionTypes: VariantOptionTypeRecord[] = [];
let variantOptionValues: VariantOptionValueRecord[] = [];

function problem(status: number, title: string, detail?: string) {
	return HttpResponse.json(
		{ type: "about:blank", status, title, ...(detail ? { detail } : {}) },
		{ status },
	);
}

function paginate<T>(items: T[], page: number, size: number) {
	const start = page * size;
	const pageItems = items.slice(start, start + size);
	const totalPages = Math.ceil(items.length / size);

	return {
		items: pageItems,
		pagination: {
			page,
			size,
			count: pageItems.length,
			total: items.length,
			next: totalPages > 0 ? Math.max(totalPages - (page + 1), 0) : 0,
			previous: page > 0 ? page - 1 : 0,
		},
	};
}

export const adminHandlers = [
	// --- auth: server-to-server session check (`getServerSession()`) ---
	http.get("*/api/auth/get-session", ({ request }) => {
		const auth = request.headers.get("authorization");
		if (auth === `Bearer ${MOCK_BEARER_TOKEN}`) {
			return HttpResponse.json(MOCK_SESSION, { status: 200 });
		}
		return HttpResponse.json(null, { status: 200 });
	}),

	// --- admin/categories ---
	http.get("*/api/v1/admin/categories", () => {
		return HttpResponse.json(categories, { status: 200 });
	}),

	http.post("*/api/v1/admin/categories", async ({ request }) => {
		const body = (await request.json()) as { name: string; isActive?: boolean };
		const now = new Date().toISOString();
		const category = {
			id: `cat-${crypto.randomUUID()}`,
			name: body.name,
			slug: body.name.toLowerCase().replace(/\s+/g, "-"),
			isActive: body.isActive ?? true,
			createdAt: now,
			updatedAt: now,
		};
		categories = [...categories, category];
		return HttpResponse.json(category, { status: 201 });
	}),

	http.get("*/api/v1/admin/categories/:id", ({ params }) => {
		const category = categories.find((item) => item.id === params.id);
		if (!category) return problem(404, "Not Found", "Category not found.");
		return HttpResponse.json(category, { status: 200 });
	}),

	http.patch("*/api/v1/admin/categories/:id", async ({ params, request }) => {
		// `.find()`, not `.findIndex()` + index access — `noUncheckedIndexedAccess`
		// (ADR 0030) types `categories[index]` as `CategoryRecord | undefined`
		// regardless of a prior `index !== -1` check, which makes every spread
		// property from it optional in the merged result. `.find()` narrows
		// directly via the `if (!existing)` guard below instead.
		const existing = categories.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Category not found.");
		const body = (await request.json()) as Partial<{
			name: string;
			isActive: boolean;
		}>;
		const updated = {
			...existing,
			...body,
			updatedAt: new Date().toISOString(),
		};
		categories = categories.map((item) =>
			item.id === params.id ? updated : item,
		);
		return HttpResponse.json(updated, { status: 200 });
	}),

	http.delete("*/api/v1/admin/categories/:id", ({ params }) => {
		const exists = categories.some((item) => item.id === params.id);
		if (!exists) return problem(404, "Not Found", "Category not found.");
		categories = categories.filter((item) => item.id !== params.id);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/products ---
	http.get("*/api/v1/admin/products", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "0") || 0;
		const size = Number(url.searchParams.get("size") ?? "10") || 10;
		const { items, pagination } = paginate(products, page, size);
		return HttpResponse.json({ items, pagination }, { status: 200 });
	}),

	http.post("*/api/v1/admin/products", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const now = new Date().toISOString();
		const product = {
			id: `prod-${crypto.randomUUID()}`,
			name: body.name as string,
			slug: String(body.name).toLowerCase().replace(/\s+/g, "-"),
			code: (body.code as string) ?? null,
			altCode: (body.altCode as string) ?? null,
			description: (body.description as string) ?? null,
			price: body.price as number,
			stock: (body.stock as number) ?? 0,
			stockMin: (body.stockMin as number) ?? 0,
			coverImage: (body.coverImage as string) ?? null,
			categoryId: (body.categoryId as string) ?? null,
			isActive: (body.isActive as boolean) ?? true,
			createdAt: now,
			updatedAt: now,
		};
		products = [...products, product];
		return HttpResponse.json(product, { status: 201 });
	}),

	http.get("*/api/v1/admin/products/:id", ({ params }) => {
		const product = products.find((item) => item.id === params.id);
		if (!product) return problem(404, "Not Found", "Product not found.");
		return HttpResponse.json(product, { status: 200 });
	}),

	http.patch("*/api/v1/admin/products/:id", async ({ params, request }) => {
		const existing = products.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Product not found.");
		const body = (await request.json()) as Record<string, unknown>;
		const updated = {
			...existing,
			...body,
			updatedAt: new Date().toISOString(),
		};
		products = products.map((item) => (item.id === params.id ? updated : item));
		return HttpResponse.json(updated, { status: 200 });
	}),

	http.delete("*/api/v1/admin/products/:id", ({ params }) => {
		const exists = products.some((item) => item.id === params.id);
		if (!exists) return problem(404, "Not Found", "Product not found.");
		products = products.filter((item) => item.id !== params.id);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/product-images ---
	http.get("*/api/v1/admin/product-images", ({ request }) => {
		const url = new URL(request.url);
		const productId = url.searchParams.get("productId");
		const items = productId
			? productImages.filter((item) => item.productId === productId)
			: productImages;
		return HttpResponse.json(items, { status: 200 });
	}),

	http.post("*/api/v1/admin/product-images", async ({ request }) => {
		const body = (await request.json()) as {
			productId: string;
			url: string;
			position?: number;
		};
		const image = {
			id: `img-${crypto.randomUUID()}`,
			productId: body.productId,
			url: body.url,
			position: body.position ?? 0,
			createdAt: new Date().toISOString(),
		};
		productImages = [...productImages, image];
		return HttpResponse.json(image, { status: 201 });
	}),

	http.get("*/api/v1/admin/product-images/:id", ({ params }) => {
		const image = productImages.find((item) => item.id === params.id);
		if (!image) return problem(404, "Not Found", "Product image not found.");
		return HttpResponse.json(image, { status: 200 });
	}),

	http.patch(
		"*/api/v1/admin/product-images/:id",
		async ({ params, request }) => {
			const existing = productImages.find((item) => item.id === params.id);
			if (!existing)
				return problem(404, "Not Found", "Product image not found.");
			const body = (await request.json()) as Partial<{
				url: string;
				position: number;
			}>;
			const updated = { ...existing, ...body };
			productImages = productImages.map((item) =>
				item.id === params.id ? updated : item,
			);
			return HttpResponse.json(updated, { status: 200 });
		},
	),

	http.delete("*/api/v1/admin/product-images/:id", ({ params }) => {
		const exists = productImages.some((item) => item.id === params.id);
		if (!exists) return problem(404, "Not Found", "Product image not found.");
		productImages = productImages.filter((item) => item.id !== params.id);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/variant-option-types ---
	http.get("*/api/v1/admin/variant-option-types", () => {
		return HttpResponse.json(variantOptionTypes, { status: 200 });
	}),

	http.post("*/api/v1/admin/variant-option-types", async ({ request }) => {
		const body = (await request.json()) as {
			name: string;
			displayOrder?: number;
		};
		const slug = toSlug(body.name);
		if (variantOptionTypes.some((item) => item.slug === slug)) {
			return problem(
				409,
				"Conflict",
				"An option type with this slug already exists.",
			);
		}
		const now = new Date().toISOString();
		const optionType: VariantOptionTypeRecord = {
			// A real (unprefixed) UUID, unlike the `cat-`/`prod-`/`img-`-prefixed
			// convention used by the mocks above — `variant-option-values/types.ts`'s
			// `optionTypeId: z.uuid()` client-side schema (design DDL:
			// `uuid().primaryKey().default(gen_random_uuid())`) rejects a
			// prefixed id at form-submit time, unlike those other entities'
			// forms, which never validate their scoping id as a UUID shape.
			id: crypto.randomUUID(),
			name: body.name,
			slug,
			displayOrder: body.displayOrder ?? 0,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		};
		variantOptionTypes = [...variantOptionTypes, optionType];
		return HttpResponse.json(optionType, { status: 201 });
	}),

	http.get("*/api/v1/admin/variant-option-types/:id", ({ params }) => {
		const optionType = variantOptionTypes.find((item) => item.id === params.id);
		if (!optionType) return problem(404, "Not Found", "Option type not found.");
		return HttpResponse.json(optionType, { status: 200 });
	}),

	http.patch(
		"*/api/v1/admin/variant-option-types/:id",
		async ({ params, request }) => {
			const existing = variantOptionTypes.find((item) => item.id === params.id);
			if (!existing) return problem(404, "Not Found", "Option type not found.");
			const body = (await request.json()) as Partial<{
				name: string;
				displayOrder: number;
				isActive: boolean;
			}>;
			const slug = body.name ? toSlug(body.name) : existing.slug;
			const updated = {
				...existing,
				...body,
				slug,
				updatedAt: new Date().toISOString(),
			};
			variantOptionTypes = variantOptionTypes.map((item) =>
				item.id === params.id ? updated : item,
			);
			return HttpResponse.json(updated, { status: 200 });
		},
	),

	// Soft delete (design D6) — matches `apps/api`'s own convention: `isActive`
	// flips to `false`, the row is never removed from the collection.
	http.delete("*/api/v1/admin/variant-option-types/:id", ({ params }) => {
		const existing = variantOptionTypes.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Option type not found.");
		variantOptionTypes = variantOptionTypes.map((item) =>
			item.id === params.id
				? { ...item, isActive: false, updatedAt: new Date().toISOString() }
				: item,
		);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/variant-option-values (scoped by `?optionTypeId=`) ---
	http.get("*/api/v1/admin/variant-option-values", ({ request }) => {
		const url = new URL(request.url);
		const optionTypeId = url.searchParams.get("optionTypeId");
		const items = optionTypeId
			? variantOptionValues.filter((item) => item.optionTypeId === optionTypeId)
			: variantOptionValues;
		return HttpResponse.json(items, { status: 200 });
	}),

	http.post("*/api/v1/admin/variant-option-values", async ({ request }) => {
		const body = (await request.json()) as {
			optionTypeId: string;
			value: string;
			imageUrl?: string;
			description?: string;
			displayOrder?: number;
		};
		const slug = toSlug(body.value);
		if (
			variantOptionValues.some(
				(item) => item.optionTypeId === body.optionTypeId && item.slug === slug,
			)
		) {
			return problem(
				409,
				"Conflict",
				"A value with this slug already exists for this option type.",
			);
		}
		const now = new Date().toISOString();
		const optionValue: VariantOptionValueRecord = {
			id: crypto.randomUUID(),
			optionTypeId: body.optionTypeId,
			value: body.value,
			slug,
			imageUrl: body.imageUrl ?? null,
			description: body.description ?? null,
			displayOrder: body.displayOrder ?? 0,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		};
		variantOptionValues = [...variantOptionValues, optionValue];
		return HttpResponse.json(optionValue, { status: 201 });
	}),

	http.get("*/api/v1/admin/variant-option-values/:id", ({ params }) => {
		const optionValue = variantOptionValues.find(
			(item) => item.id === params.id,
		);
		if (!optionValue)
			return problem(404, "Not Found", "Option value not found.");
		return HttpResponse.json(optionValue, { status: 200 });
	}),

	http.patch(
		"*/api/v1/admin/variant-option-values/:id",
		async ({ params, request }) => {
			const existing = variantOptionValues.find(
				(item) => item.id === params.id,
			);
			if (!existing)
				return problem(404, "Not Found", "Option value not found.");
			const body = (await request.json()) as Partial<{
				value: string;
				imageUrl: string | null;
				description: string | null;
				displayOrder: number;
				isActive: boolean;
			}>;
			const slug = body.value ? toSlug(body.value) : existing.slug;
			const updated = {
				...existing,
				...body,
				slug,
				updatedAt: new Date().toISOString(),
			};
			variantOptionValues = variantOptionValues.map((item) =>
				item.id === params.id ? updated : item,
			);
			return HttpResponse.json(updated, { status: 200 });
		},
	),

	// Soft delete (design D6), same convention as variant-option-types above.
	http.delete("*/api/v1/admin/variant-option-values/:id", ({ params }) => {
		const existing = variantOptionValues.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Option value not found.");
		variantOptionValues = variantOptionValues.map((item) =>
			item.id === params.id
				? { ...item, isActive: false, updatedAt: new Date().toISOString() }
				: item,
		);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/stock (projection over `products` — read + update only) ---
	http.get("*/api/v1/admin/stock", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "0") || 0;
		const size = Number(url.searchParams.get("size") ?? "10") || 10;
		const start = page * size;
		const items = products.slice(start, start + size).map((product) => ({
			id: product.id,
			name: product.name,
			slug: product.slug,
			stock: product.stock,
			stockMin: product.stockMin,
			code: product.code,
			altCode: product.altCode,
			coverImage: product.coverImage,
		}));
		return HttpResponse.json(items, { status: 200 });
	}),

	http.get("*/api/v1/admin/stock/:id", ({ params }) => {
		const product = products.find((item) => item.id === params.id);
		if (!product) return problem(404, "Not Found", "Stock item not found.");
		return HttpResponse.json(
			{
				id: product.id,
				name: product.name,
				slug: product.slug,
				stock: product.stock,
				stockMin: product.stockMin,
				code: product.code,
				altCode: product.altCode,
				coverImage: product.coverImage,
			},
			{ status: 200 },
		);
	}),

	http.patch("*/api/v1/admin/stock/:id", async ({ params, request }) => {
		const existing = products.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Stock item not found.");
		const body = (await request.json()) as { stock: number; stockMin: number };
		const updated = {
			...existing,
			stock: body.stock,
			stockMin: body.stockMin,
			updatedAt: new Date().toISOString(),
		};
		products = products.map((item) => (item.id === params.id ? updated : item));
		return HttpResponse.json(
			{
				id: updated.id,
				name: updated.name,
				slug: updated.slug,
				stock: updated.stock,
				stockMin: updated.stockMin,
				code: updated.code,
				altCode: updated.altCode,
				coverImage: updated.coverImage,
			},
			{ status: 200 },
		);
	}),

	// --- admin/orders (read-only — no create/update/delete route exists) ---
	http.get("*/api/v1/admin/orders", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "0") || 0;
		const size = Number(url.searchParams.get("size") ?? "10") || 10;
		const status = url.searchParams.get("status");
		const filtered = status
			? orders.filter((order) => order.status === status)
			: orders;
		const { items, pagination } = paginate(filtered, page, size);
		return HttpResponse.json({ items, pagination }, { status: 200 });
	}),

	http.get("*/api/v1/admin/orders/:id", ({ params }) => {
		const order = orders.find((item) => item.id === params.id);
		if (!order) return problem(404, "Not Found", "Order not found.");
		return HttpResponse.json(order, { status: 200 });
	}),
];
