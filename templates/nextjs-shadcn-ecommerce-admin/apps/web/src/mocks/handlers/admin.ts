import { HttpResponse, http } from "msw";

import { MOCK_BEARER_TOKEN, MOCK_SESSION } from "@/mocks/data/auth";
import { defaultCategorySeed } from "@/mocks/data/categories";
import { defaultOrderSeed } from "@/mocks/data/orders";
import { defaultProductImageSeed } from "@/mocks/data/product-images";
import { defaultProductSeed } from "@/mocks/data/products";
import {
	defaultVariantOptionTypeSeed,
	defaultVariantOptionValueSeed,
	type VariantOptionTypeRecord,
	type VariantOptionValueRecord,
} from "@/mocks/data/variant-option-types";
import { defaultVariantSeed, type VariantRecord } from "@/mocks/data/variants";

/**
 * Hand-written MSW handler set for the ADMIN surface (Phase 7b) — mirrors
 * `handlers/storefront.ts`'s own posture (per-module fixtures, composed into
 * `src/mocks/node.ts`), extended to cover every admin entity
 * (`categories`/`products`/`variants`/`variant-option-{types,values}`/
 * `product-images`/`stock`/`orders`) plus the one server-side auth call the
 * admin route group's own gate depends on (`getServerSession()`'s
 * `GET /api/auth/get-session`).
 *
 * **In-memory, mutable state, reset per process** — module-scope arrays
 * (`categories`/`products`/`variants`/`productImages`/
 * `variantOptionTypes`/`variantOptionValues`), not `handlers/storefront.ts`'s
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
 * **`variantOptionTypes`/`variantOptionValues` (PR8 seeded these empty;
 * task 9.3 replaces that with real, shared fixture data)** — imported from
 * `mocks/data/variant-option-types.ts` now, same real (unprefixed UUID)
 * ids `variants.ts`'s own `optionValueIds` reference.
 */
let categories = defaultCategorySeed();
let products = defaultProductSeed();
let variants = defaultVariantSeed();
let productImages = defaultProductImageSeed();
const orders = defaultOrderSeed();

function toSlug(value: string) {
	return value.toLowerCase().replace(/\s+/g, "-");
}

/**
 * A product's derived `defaultPrice`/`variantCount` — the SAME projection
 * `admin/products/repository.ts#toProduct()` computes at read time from a
 * join to `product_variants` (design D4: "no stored rollup price/stock
 * column"). Mirrored here rather than stored on `ProductRecord` itself.
 */
function withDerivedFields(product: (typeof products)[number]) {
	const productVariants = variants.filter((v) => v.productId === product.id);
	const defaultVariant =
		productVariants.find((v) => v.isDefault) ?? productVariants[0];
	return {
		...product,
		defaultPrice: defaultVariant?.price ?? null,
		variantCount: productVariants.length,
	};
}

let variantOptionTypes = defaultVariantOptionTypeSeed();
let variantOptionValues = defaultVariantOptionValueSeed();

/**
 * Resolves a variant's `optionValueIds` into a joined, human-readable
 * `variantLabel` (e.g. `"Natural"`, `"Red / M"`), `null` when the variant
 * has zero selections — the SAME `variant_option_types.display_order` then
 * `variant_option_values.display_order`, `" / "`-joined convention
 * confirmed for `admin/stock`/`Dlocal`/the storefront selector (see
 * `modules/variants/types.ts#resolveVariantOptionLabels`'s own admin-side
 * equivalent).
 */
function resolveVariantLabel(variant: VariantRecord): string | null {
	if (variant.optionValueIds.length === 0) return null;
	const labels = variant.optionValueIds
		.map((id) => variantOptionValues.find((v) => v.id === id))
		.filter((v): v is (typeof variantOptionValues)[number] => v !== undefined)
		.map((value) => ({
			value,
			type: variantOptionTypes.find((t) => t.id === value.optionTypeId),
		}))
		.sort((a, b) => {
			const typeOrder =
				(a.type?.displayOrder ?? 0) - (b.type?.displayOrder ?? 0);
			if (typeOrder !== 0) return typeOrder;
			return a.value.displayOrder - b.value.displayOrder;
		})
		.map(({ value }) => value.value);
	return labels.length > 0 ? labels.join(" / ") : null;
}

/**
 * `admin/stock`'s projection over `product_variants` joined to its parent
 * `products` row (`id` is the VARIANT id — design's own retarget).
 */
function toStockItem(variant: VariantRecord) {
	const product = products.find((p) => p.id === variant.productId);
	return {
		id: variant.id,
		productId: variant.productId,
		name: product?.name ?? "",
		slug: product?.slug ?? "",
		variantLabel: resolveVariantLabel(variant),
		stock: variant.stock,
		stockMin: variant.stockMin,
		code: variant.code,
		altCode: variant.altCode,
		coverImage: product?.coverImage ?? null,
	};
}

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
	// **Retargeted (task 9.3)**: no `code`/`price`/`stock`/`stockMin` here
	// anymore — a product is created as a draft (design D3, `isActive` never
	// accepted on create), and every response is projected through
	// `withDerivedFields()` for its `defaultPrice`/`variantCount`.
	http.get("*/api/v1/admin/products", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "0") || 0;
		const size = Number(url.searchParams.get("size") ?? "10") || 10;
		const { items, pagination } = paginate(products, page, size);
		return HttpResponse.json(
			{ items: items.map(withDerivedFields), pagination },
			{ status: 200 },
		);
	}),

	http.post("*/api/v1/admin/products", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const now = new Date().toISOString();
		const product = {
			id: crypto.randomUUID(),
			name: body.name as string,
			slug: String(body.name).toLowerCase().replace(/\s+/g, "-"),
			description: (body.description as string) ?? null,
			coverImage: (body.coverImage as string) ?? null,
			categoryId: (body.categoryId as string) ?? null,
			isActive: false,
			createdAt: now,
			updatedAt: now,
		};
		products = [...products, product];
		return HttpResponse.json(withDerivedFields(product), { status: 201 });
	}),

	http.get("*/api/v1/admin/products/:id", ({ params }) => {
		const product = products.find((item) => item.id === params.id);
		if (!product) return problem(404, "Not Found", "Product not found.");
		return HttpResponse.json(withDerivedFields(product), { status: 200 });
	}),

	http.patch("*/api/v1/admin/products/:id", async ({ params, request }) => {
		const existing = products.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Product not found.");
		const body = (await request.json()) as Record<string, unknown>;
		if (body.isActive === true) {
			const hasActiveVariant = variants.some(
				(v) => v.productId === existing.id && v.isActive,
			);
			if (!hasActiveVariant) {
				return problem(
					422,
					"Unprocessable Entity",
					"A product needs at least one active variant before it can be published.",
				);
			}
		}
		const updated = {
			...existing,
			...body,
			updatedAt: new Date().toISOString(),
		};
		products = products.map((item) => (item.id === params.id ? updated : item));
		return HttpResponse.json(withDerivedFields(updated), { status: 200 });
	}),

	http.delete("*/api/v1/admin/products/:id", ({ params }) => {
		const exists = products.some((item) => item.id === params.id);
		if (!exists) return problem(404, "Not Found", "Product not found.");
		products = products.filter((item) => item.id !== params.id);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- admin/variants (scoped by `?productId=`) ---
	http.get("*/api/v1/admin/variants", ({ request }) => {
		const url = new URL(request.url);
		const productId = url.searchParams.get("productId");
		const items = productId
			? variants.filter((item) => item.productId === productId)
			: variants;
		return HttpResponse.json(items, { status: 200 });
	}),

	http.post("*/api/v1/admin/variants", async ({ request }) => {
		const body = (await request.json()) as {
			productId: string;
			code?: string;
			altCode?: string;
			price: number;
			stock?: number;
			stockMin?: number;
			isDefault?: boolean;
			displayOrder?: number;
			optionValueIds?: string[];
		};
		const now = new Date().toISOString();
		const isDefault = body.isDefault ?? false;
		// Clear any sibling default, same "swap inside one transaction"
		// invariant as the real `admin/variants` module (design D7).
		if (isDefault) {
			variants = variants.map((item) =>
				item.productId === body.productId
					? { ...item, isDefault: false }
					: item,
			);
		}
		const variant: VariantRecord = {
			id: crypto.randomUUID(),
			productId: body.productId,
			code: body.code ?? null,
			altCode: body.altCode ?? null,
			price: body.price,
			stock: body.stock ?? 0,
			stockMin: body.stockMin ?? 0,
			isDefault,
			isActive: true,
			displayOrder: body.displayOrder ?? 0,
			optionValueIds: body.optionValueIds ?? [],
			createdAt: now,
			updatedAt: now,
		};
		variants = [...variants, variant];
		return HttpResponse.json(variant, { status: 201 });
	}),

	http.get("*/api/v1/admin/variants/:id", ({ params }) => {
		const variant = variants.find((item) => item.id === params.id);
		if (!variant) return problem(404, "Not Found", "Variant not found.");
		return HttpResponse.json(variant, { status: 200 });
	}),

	http.patch("*/api/v1/admin/variants/:id", async ({ params, request }) => {
		const existing = variants.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Variant not found.");
		const body = (await request.json()) as Partial<{
			code: string | null;
			altCode: string | null;
			price: number;
			stock: number;
			stockMin: number;
			isDefault: boolean;
			isActive: boolean;
			displayOrder: number;
			optionValueIds: string[];
		}>;
		if (body.isDefault === true) {
			variants = variants.map((item) =>
				item.productId === existing.productId && item.id !== existing.id
					? { ...item, isDefault: false }
					: item,
			);
		}
		const updated = {
			...existing,
			...body,
			updatedAt: new Date().toISOString(),
		};
		variants = variants.map((item) => (item.id === params.id ? updated : item));
		return HttpResponse.json(updated, { status: 200 });
	}),

	// Hard delete, matching `apps/api`'s own `admin/variants` module — unlike
	// `variant-option-types`/`-values`, a variant is never soft-deleted
	// (design D6 applies to the vocabulary, not to variants themselves).
	http.delete("*/api/v1/admin/variants/:id", ({ params }) => {
		const exists = variants.some((item) => item.id === params.id);
		if (!exists) return problem(404, "Not Found", "Variant not found.");
		variants = variants.filter((item) => item.id !== params.id);
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

	// --- admin/stock (projection over `product_variants`, `id` is the
	// VARIANT id — read + update only, retargeted per task 9.3/9.4) ---
	http.get("*/api/v1/admin/stock", ({ request }) => {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page") ?? "0") || 0;
		const size = Number(url.searchParams.get("size") ?? "10") || 10;
		const start = page * size;
		const items = variants.slice(start, start + size).map(toStockItem);
		return HttpResponse.json(items, { status: 200 });
	}),

	http.get("*/api/v1/admin/stock/:id", ({ params }) => {
		const variant = variants.find((item) => item.id === params.id);
		if (!variant) return problem(404, "Not Found", "Stock item not found.");
		return HttpResponse.json(toStockItem(variant), { status: 200 });
	}),

	http.patch("*/api/v1/admin/stock/:id", async ({ params, request }) => {
		const existing = variants.find((item) => item.id === params.id);
		if (!existing) return problem(404, "Not Found", "Stock item not found.");
		const body = (await request.json()) as { stock: number; stockMin: number };
		const updated = {
			...existing,
			stock: body.stock,
			stockMin: body.stockMin,
			updatedAt: new Date().toISOString(),
		};
		variants = variants.map((item) => (item.id === params.id ? updated : item));
		return HttpResponse.json(toStockItem(updated), { status: 200 });
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
