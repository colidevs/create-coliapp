import { asc, eq } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import type {
	GetProductImagesParams,
	ProductImage,
	ProductImageCreate,
	ProductImageUpdate,
} from "./types";

const { productImages } = schema;

function toProductImage(row: typeof productImages.$inferSelect): ProductImage {
	return {
		id: row.id,
		productId: row.productId,
		url: row.url,
		position: row.position,
		createdAt: row.createdAt.toISOString(),
	};
}

export interface Repository {
	get: (params: GetProductImagesParams) => Promise<ProductImage[]>;
	getById: (id: string) => Promise<ProductImage | null>;
	create: (input: ProductImageCreate) => Promise<ProductImage>;
	update: (
		id: string,
		input: ProductImageUpdate,
	) => Promise<ProductImage | null>;
	delete: (id: string) => Promise<boolean>;
}

function productImageRepo(): Repository {
	async function get(
		params: GetProductImagesParams,
	): ReturnType<Repository["get"]> {
		const where = params.productId
			? eq(productImages.productId, params.productId)
			: undefined;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(productImages)
				.where(where)
				.orderBy(asc(productImages.position));

			return rows.map(toProductImage);
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(productImages)
				.where(eq(productImages.id, id));

			return row ? toProductImage(row) : null;
		});
	}

	async function create(
		input: ProductImageCreate,
	): ReturnType<Repository["create"]> {
		return withPlatformSession(async (tx) => {
			const [inserted] = await tx
				.insert(productImages)
				.values({
					productId: input.productId,
					url: input.url,
					...(input.position !== undefined ? { position: input.position } : {}),
				})
				.returning();

			return toProductImage(inserted);
		});
	}

	async function update(
		id: string,
		input: ProductImageUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof productImages.$inferInsert> = {};

		if (input.url !== undefined) values.url = input.url;
		if (input.position !== undefined) values.position = input.position;

		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(productImages)
				.set(values)
				.where(eq(productImages.id, id))
				.returning();

			return row ? toProductImage(row) : null;
		});
	}

	/**
	 * @description Hard delete — no `isActive` column exists on this table
	 * to soft-delete against (see `./types.ts`'s doc comment).
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		return withPlatformSession(async (tx) => {
			const rows = await tx
				.delete(productImages)
				.where(eq(productImages.id, id))
				.returning({ id: productImages.id });

			return rows.length > 0;
		});
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { productImageRepo as createProductImageRepository };
