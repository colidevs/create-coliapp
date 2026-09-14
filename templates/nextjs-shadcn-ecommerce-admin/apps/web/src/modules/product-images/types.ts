import { z } from "zod";

import type {
	CreateProductImageBody,
	ListProductImagesParams,
	ProductImage,
	UpdateProductImageBody,
} from "@/generated/model";

export type {
	CreateProductImageBody as ProductImageCreate,
	ListProductImagesParams,
	ProductImage,
	UpdateProductImageBody as ProductImageUpdate,
};

/**
 * Client-side validation schema for `form.tsx`. `productId` is required only
 * on create (`ProductImageForm`'s own required-prop, not this shared
 * schema) — this template ships no standalone product-images admin page in
 * munod (images are managed inline inside its product form); the design's
 * own directory tree makes it a standalone CRUD entity instead, matching
 * the flat `GET /admin/product-images?productId=` shape `apps/api` actually
 * exposes.
 */
export const productImageFormSchema = z.object({
	productId: z.uuid("Must be a valid product ID"),
	url: z.url("Must be a valid URL"),
	// Plain `z.number()`, not `z.coerce.number()` — the input's `<Input
	// type="number">` registers with RHF's own `valueAsNumber: true` option
	// instead, keeping this schema's input and output types identical
	// (`number`). `z.coerce.number()` would otherwise make the resolver's
	// pre-parse (input) type `unknown`, which does not satisfy
	// `useForm<ProductImageFormValues>`'s generic under ADR 0030's
	// `exactOptionalPropertyTypes` floor.
	position: z.number().int().min(0).optional(),
});

export type ProductImageFormValues = z.infer<typeof productImageFormSchema>;
