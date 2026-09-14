/**
 * @description Invoked via the `tsx` CLI (`pnpm generate:openapi`,
 * `pnpm generate:openapi:check` — see `package.json`), never `node`
 * directly: it imports `.ts` modules and this template's `@/*` path alias
 * (`tsconfig.json`), both of which `tsx` resolves out of the box.
 *
 * Generates `openapi/openapi.yaml` from this template's Zod
 * schemas via `zod-openapi` — colidevs' code-first OpenAPI standard
 * (hefesto ADR 0040, superseding ADR 0005's Apidog-first design mandate;
 * see `.claude/rules/api-design-apidog.md`). Zod schemas
 * (`src/v1/modules/**\/types.ts`, `src/v1/res/problem-schema.ts`) are the
 * source of truth — `openapi/openapi.yaml` is a generated artifact. Do not
 * hand-edit it; edit the schema/route wiring below (and the imported
 * `types.ts` modules) instead, then re-run `pnpm generate:openapi`.
 *
 * `--check` (wired as `pnpm generate:openapi:check`, and into
 * `.github/workflows/api-standard.yml`): regenerates the document in memory
 * and diffs it byte-for-byte against the committed file without writing
 * anything — ADR 0040's 2026-08-31 addendum ("generate-and-diff
 * verification is mandatory, not implied"). Exits non-zero the moment the
 * committed file has drifted from what the current schemas would produce.
 *
 * Deliberately deterministic: no timestamps, no machine-specific paths, no
 * randomised key order in the emitted document — the same schemas must
 * always produce byte-identical YAML, or the `--check` mode is meaningless.
 *
 * New paths/schemas are added here as this template's real API grows —
 * this file's own `buildDocument()` is the one place `openapi/openapi.yaml`
 * is assembled from, mirroring how `drizzle-kit generate` treats
 * `drizzle/*.sql` as generated output of `src/lib/db/schema.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, Scalar } from "yaml";
import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
	CategoryCreateSchema,
	CategorySchema,
	CategoryUpdateSchema,
} from "@/v1/modules/admin/categories/types";
import { OrderListSchema, OrderSchema } from "@/v1/modules/admin/orders/types";
import {
	ProductImageCreateSchema,
	ProductImageSchema,
	ProductImageUpdateSchema,
} from "@/v1/modules/admin/product-images/types";
import {
	ProductCreateSchema,
	ProductListSchema,
	ProductSchema,
	ProductUpdateSchema,
} from "@/v1/modules/admin/products/types";
import {
	StockItemSchema,
	StockUpdateSchema,
} from "@/v1/modules/admin/stock/types";
import {
	CheckoutRequestSchema,
	CheckoutResponseSchema,
	DlocalNotificationSchema,
} from "@/v1/modules/Dlocal/types";
import { HealthcheckStatusResponseSchema } from "@/v1/modules/healthcheck/types";
import { MeResponseSchema } from "@/v1/modules/me/types";
import { ProblemSchema } from "@/v1/res/problem-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(__dirname, "../openapi/openapi.yaml");

const GENERATED_FILE_HEADER = `# GENERATED FILE — DO NOT EDIT BY HAND.
#
# Produced by \`pnpm generate:openapi\` (\`scripts/generate-openapi.ts\`) from
# this template's Zod schemas via \`zod-openapi\` — colidevs' code-first
# OpenAPI standard (hefesto ADR 0040, superseding ADR 0005's Apidog-first
# design mandate; see \`.claude/rules/api-design-apidog.md\`). To change this
# document, edit the Zod schemas (\`src/v1/modules/**/types.ts\`,
# \`src/v1/res/problem-schema.ts\`) and/or the route wiring in
# \`scripts/generate-openapi.ts\`, then re-run the generator.
#
# \`pnpm generate:openapi:check\` (wired into
# \`.github/workflows/api-standard.yml\`) fails the build the moment this
# file drifts from a fresh regeneration — ADR 0040's 2026-08-31 addendum.
`;

function buildDocument() {
	return createDocument({
		openapi: "3.1.0",
		info: {
			title: "{{name}}",
			version: "1.0.0",
			description:
				"Minimal starter spec for this template's existing endpoints, generated from its Zod schemas (ADR 0040). Extend the schema/route modules this script imports as the project's real API contract grows — never hand-edit this file.",
		},
		servers: [{ url: "/api/v1" }],
		components: {
			schemas: {
				Problem: ProblemSchema,
				Category: CategorySchema,
				CategoryCreate: CategoryCreateSchema,
				CategoryUpdate: CategoryUpdateSchema,
				Product: ProductSchema,
				ProductCreate: ProductCreateSchema,
				ProductUpdate: ProductUpdateSchema,
				ProductList: ProductListSchema,
				ProductImage: ProductImageSchema,
				StockItem: StockItemSchema,
				StockUpdate: StockUpdateSchema,
				Order: OrderSchema,
				OrderList: OrderListSchema,
			},
			securitySchemes: {
				// Better Auth session cookie (ADR 0022) — read via
				// `fromNodeHeaders`/`getAuth().api.getSession` in
				// `src/v1/middlewares/auth.ts`, never an `Authorization: Bearer`
				// header, for this template's default same-root-domain topology.
				sessionCookie: {
					type: "apiKey",
					in: "cookie",
					name: "better-auth.session_token",
				},
				// OAuth2 Bearer (ADR 0009), kept available for a cross-root-domain
				// deployment using ADR 0036's escape hatch — not the default `/me`
				// scheme above.
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
				// Service-to-service static-key auth (ADR 0009's carve-out).
				// Enforced at runtime by `src/v1/middlewares/service-auth.ts` on
				// every `/api/v1` operation regardless of what a given route's own
				// `security` array declares — declared here only as a documented,
				// AND-combined requirement on `/me` below.
				apiKeyAuth: {
					type: "apiKey",
					in: "header",
					name: "x-service-key",
				},
			},
		},
		paths: {
			"/healthcheck/status": {
				get: {
					operationId: "getHealthcheckStatus",
					summary: "Application-level healthcheck status",
					security: [],
					responses: {
						"200": {
							description: "Healthcheck status message",
							content: {
								"application/json": {
									schema: HealthcheckStatusResponseSchema,
								},
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/me": {
				get: {
					operationId: "getMe",
					summary: "Current authenticated caller",
					description:
						"Returns the caller's own identity, resolved from the Better Auth session (`src/lib/auth.ts` / `src/v1/middlewares/auth.ts`). Requires both a valid session cookie AND the service-to-service static key (`x-service-key`) — see the `sessionCookie`/`apiKeyAuth` security schemes.",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The authenticated caller's identity",
							content: {
								"application/json": { schema: MeResponseSchema },
							},
						},
						"401": {
							description: "Missing or invalid session",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/dlocal/checkout": {
				post: {
					operationId: "createDlocalCheckout",
					summary: "Create (or replay) a dLocal Go checkout session",
					description:
						"Called by this template's own storefront (Server Action), never directly by a browser — the `x-service-key` requirement is why. Replaying the same `orderId` returns the existing session instead of creating a duplicate (idempotent).",
					security: [{ apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: CheckoutRequestSchema },
						},
					},
					responses: {
						"200": {
							description: "The created (or replayed) checkout session",
							content: {
								"application/json": { schema: CheckoutResponseSchema },
							},
						},
						"409": {
							description: "Insufficient stock for one or more items",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"502": {
							description: "dLocal Go API call failed",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/dlocal/notifications": {
				post: {
					operationId: "handleDlocalNotification",
					summary: "dLocal Go payment-notification webhook",
					description:
						"Called by dLocal Go directly, never by this app's own frontend — verified via a bespoke HMAC signature check (`v1/modules/Dlocal/signature.ts`), not the `apiKeyAuth`/`sessionCookie` schemes used elsewhere in this document. Not enforced by `express-openapi-validator` at runtime (`v1/modules/Dlocal/route.ts`'s `dlocalNotificationRouter` doc comment) — documented here for contract completeness only.",
					security: [],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: DlocalNotificationSchema },
						},
					},
					responses: {
						"200": {
							description: "Notification processed",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: { status: { type: "string" } },
										required: ["status"],
									},
								},
							},
						},
						"401": {
							description: "Invalid or missing webhook signature",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/categories": {
				get: {
					operationId: "listCategories",
					summary: "List categories",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "All categories",
							content: {
								"application/json": { schema: z.array(CategorySchema) },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				post: {
					operationId: "createCategory",
					summary: "Create a category",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: CategoryCreateSchema },
						},
					},
					responses: {
						"201": {
							description: "The created category",
							content: {
								"application/json": { schema: CategorySchema },
							},
						},
						"403": {
							description: "Not allowed to create a category",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"409": {
							description: "A category with this slug already exists",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/categories/{id}": {
				get: {
					operationId: "getCategoryById",
					summary: "Get a category by id",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The category",
							content: {
								"application/json": { schema: CategorySchema },
							},
						},
						"404": {
							description: "Category not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				patch: {
					operationId: "updateCategory",
					summary: "Update a category",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: CategoryUpdateSchema },
						},
					},
					responses: {
						"200": {
							description: "The updated category",
							content: {
								"application/json": { schema: CategorySchema },
							},
						},
						"403": {
							description: "Not allowed to update a category",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Category not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"409": {
							description: "A category with this slug already exists",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				delete: {
					operationId: "deleteCategory",
					summary: "Delete (deactivate) a category",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"204": {
							description: "Category deactivated",
						},
						"403": {
							description: "Not allowed to delete a category",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Category not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/products": {
				get: {
					operationId: "listProducts",
					summary: "List products",
					parameters: [
						{
							name: "page",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "size",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "categoryId",
							in: "query",
							schema: { type: "string", format: "uuid" },
						},
						{
							name: "q",
							in: "query",
							schema: { type: "string" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "A page of products",
							content: {
								"application/json": { schema: ProductListSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				post: {
					operationId: "createProduct",
					summary: "Create a product",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: ProductCreateSchema },
						},
					},
					responses: {
						"201": {
							description: "The created product",
							content: {
								"application/json": { schema: ProductSchema },
							},
						},
						"403": {
							description: "Not allowed to create a product",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"409": {
							description: "A product with this slug already exists",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/products/{id}": {
				get: {
					operationId: "getProductById",
					summary: "Get a product by id",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The product",
							content: {
								"application/json": { schema: ProductSchema },
							},
						},
						"404": {
							description: "Product not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				patch: {
					operationId: "updateProduct",
					summary: "Update a product",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: ProductUpdateSchema },
						},
					},
					responses: {
						"200": {
							description: "The updated product",
							content: {
								"application/json": { schema: ProductSchema },
							},
						},
						"403": {
							description: "Not allowed to update a product",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Product not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"409": {
							description: "A product with this slug already exists",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				delete: {
					operationId: "deleteProduct",
					summary: "Delete (deactivate) a product",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"204": {
							description: "Product deactivated",
						},
						"403": {
							description: "Not allowed to delete a product",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Product not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/product-images": {
				get: {
					operationId: "listProductImages",
					summary: "List product images",
					parameters: [
						{
							name: "productId",
							in: "query",
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "Product images",
							content: {
								"application/json": { schema: z.array(ProductImageSchema) },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				post: {
					operationId: "createProductImage",
					summary: "Create a product image",
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: ProductImageCreateSchema },
						},
					},
					responses: {
						"201": {
							description: "The created product image",
							content: {
								"application/json": { schema: ProductImageSchema },
							},
						},
						"403": {
							description: "Not allowed to create a product image",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/product-images/{id}": {
				get: {
					operationId: "getProductImageById",
					summary: "Get a product image by id",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The product image",
							content: {
								"application/json": { schema: ProductImageSchema },
							},
						},
						"404": {
							description: "Product image not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				patch: {
					operationId: "updateProductImage",
					summary: "Update a product image",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: ProductImageUpdateSchema },
						},
					},
					responses: {
						"200": {
							description: "The updated product image",
							content: {
								"application/json": { schema: ProductImageSchema },
							},
						},
						"403": {
							description: "Not allowed to update a product image",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Product image not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				delete: {
					operationId: "deleteProductImage",
					summary: "Delete a product image",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"204": {
							description: "Product image deleted",
						},
						"403": {
							description: "Not allowed to delete a product image",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Product image not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/stock": {
				get: {
					operationId: "listStock",
					summary: "List stock items",
					parameters: [
						{
							name: "page",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "size",
							in: "query",
							schema: { type: "integer" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "Stock items",
							content: {
								"application/json": { schema: z.array(StockItemSchema) },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/stock/{id}": {
				get: {
					operationId: "getStockById",
					summary: "Get a stock item by id",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The stock item",
							content: {
								"application/json": { schema: StockItemSchema },
							},
						},
						"404": {
							description: "Stock item not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
				patch: {
					operationId: "updateStockById",
					summary: "Set a product's stock and low-stock threshold",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					requestBody: {
						required: true,
						content: {
							"application/json": { schema: StockUpdateSchema },
						},
					},
					responses: {
						"200": {
							description: "The updated stock item",
							content: {
								"application/json": { schema: StockItemSchema },
							},
						},
						"403": {
							description: "Not allowed to update stock",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Stock item not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/orders": {
				get: {
					operationId: "listOrders",
					summary: "List orders",
					description:
						"Read-only — orders are created exclusively by the dLocal checkout flow (`/dlocal/checkout`) and their `status` transitions exclusively via the dLocal payment-notification webhook. Restricted to the `admin` role only (orders carry buyer PII) — a `viewer` session receives `403`.",
					parameters: [
						{
							name: "page",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "size",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "status",
							in: "query",
							schema: { type: "string" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "A page of orders",
							content: {
								"application/json": { schema: OrderListSchema },
							},
						},
						"403": {
							description: "Not allowed to read orders",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/admin/orders/{id}": {
				get: {
					operationId: "getOrderById",
					summary: "Get an order by id",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string", format: "uuid" },
						},
					],
					security: [{ sessionCookie: [], apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The order, including its current status",
							content: {
								"application/json": { schema: OrderSchema },
							},
						},
						"403": {
							description: "Not allowed to read orders",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						"404": {
							description: "Order not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/web/categories": {
				get: {
					operationId: "listPublicCategories",
					summary: "List active categories (storefront)",
					security: [{ apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "Active categories",
							content: {
								"application/json": { schema: z.array(CategorySchema) },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/web/products": {
				get: {
					operationId: "listPublicProducts",
					summary: "List active products (storefront)",
					parameters: [
						{
							name: "page",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "size",
							in: "query",
							schema: { type: "integer" },
						},
						{
							name: "categoryId",
							in: "query",
							schema: { type: "string", format: "uuid" },
						},
						{
							name: "q",
							in: "query",
							schema: { type: "string" },
						},
					],
					security: [{ apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "A page of active products",
							content: {
								"application/json": { schema: ProductListSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
			"/web/products/{slug}": {
				get: {
					operationId: "getPublicProductBySlug",
					summary: "Get an active product by slug (storefront)",
					parameters: [
						{
							name: "slug",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					security: [{ apiKeyAuth: [] }],
					responses: {
						"200": {
							description: "The product",
							content: {
								"application/json": { schema: ProductSchema },
							},
						},
						"404": {
							description: "Product not found",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
						default: {
							description: "Unexpected error",
							content: {
								"application/problem+json": { schema: ProblemSchema },
							},
						},
					},
				},
			},
		},
	});
}

// `pnpm create coliapp`'s `replaceName` (create-coliapp/index.ts) substitutes
// `{{name}}` via a raw text replace across every scaffolded file — it never
// re-runs a YAML serializer. `info.title` above is `"{{name}}"`, a *quoted*
// YAML scalar only because `{` is a flow-mapping indicator that forces
// quoting. Once `replaceName` swaps in a plain client name (e.g. `acme`),
// the surrounding quote characters survive untouched (`title: "acme"`), but
// a fresh regeneration serializes that same plain string unquoted
// (`title: acme` — the `yaml` package never quotes a plain-safe scalar).
// That mismatch fails `--check` on every single scaffold, unconditionally,
// regardless of which client name was substituted.
//
// Fixing the plain-scalar/quoted-scalar disagreement requires the emitted
// bytes to be quoted the SAME way both before and after `replaceName` runs —
// which the placeholder text itself already is (`"{{name}}"` is quoted only
// because of its braces). Forcing `info.title` to always serialize as a
// double-quoted scalar, regardless of its actual string content, keeps the
// committed file's quoting form stable under `replaceName`'s substitution
// for any client name: quoted before substitution (braces), quoted after
// (this override), so the two never diverge.
function render(): string {
	const stringifyOptions = { aliasDuplicateObjects: false } as const;
	const doc = new Document(buildDocument(), null, stringifyOptions);
	const titleNode = doc.getIn(["info", "title"], true);
	if (titleNode instanceof Scalar) {
		titleNode.type = Scalar.QUOTE_DOUBLE;
	}
	const yaml = doc.toString(stringifyOptions);
	return `${GENERATED_FILE_HEADER}\n${yaml}`;
}

function main() {
	const checkOnly = process.argv.includes("--check");
	const rendered = render();

	if (!checkOnly) {
		writeFileSync(OPENAPI_PATH, rendered, "utf-8");
		console.log(`Generated ${path.relative(process.cwd(), OPENAPI_PATH)}`);
		return;
	}

	let committed: string;
	try {
		committed = readFileSync(OPENAPI_PATH, "utf-8");
	} catch {
		console.error(
			`generate:openapi:check — ${OPENAPI_PATH} does not exist. Run \`pnpm generate:openapi\` first.`,
		);
		process.exitCode = 1;
		return;
	}

	if (committed !== rendered) {
		console.error(
			"generate:openapi:check — openapi/openapi.yaml is stale: it does not " +
				"match what `pnpm generate:openapi` produces from the current Zod " +
				"schemas. Run `pnpm generate:openapi` and commit the result.",
		);
		process.exitCode = 1;
		return;
	}

	console.log("openapi/openapi.yaml is up to date.");
}

main();
