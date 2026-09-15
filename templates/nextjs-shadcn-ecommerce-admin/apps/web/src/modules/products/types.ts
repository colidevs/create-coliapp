import { z } from "zod";

import type {
	ListProductsParams,
	ProductCreate,
	ProductOutput,
	ProductUpdate,
	PublicProductOutput,
	PublicVariantOutput,
} from "@/generated/model";

export type { ListProductsParams, ProductCreate, ProductUpdate };
/** `ProductOutput` (the response shape) aliased as `Product` — the module's own conventional name, matching `categories`/`product-images`. */
export type Product = ProductOutput;

/**
 * `PublicProductOutput`/`PublicVariantOutput` (the storefront read shapes,
 * `web/products` domain — `sdd/ecommerce-product-variants/design`, Phase 7)
 * aliased the same way, for the same reason: the module's own conventional
 * name over Orval's generated response-type name.
 */
export type PublicProduct = PublicProductOutput;
export type PublicVariant = PublicVariantOutput;

/**
 * Client-side validation schema for `form.tsx` (`@tanstack/react-form`,
 * per-field `validators.onChange`) — mirrors `apps/api`'s `ProductCreateSchema`/
 * `ProductUpdateSchema` (`admin/products/types.ts`), authored independently
 * per the same reasoning as `modules/categories/types.ts`.
 *
 * **Retargeted (`sdd/ecommerce-product-variants`, design D3/D4)**:
 * `code`/`altCode`/`price`/`stock`/`stockMin` are DROPPED — those moved to
 * `product_variants`. A product is now catalog metadata only (name, slug,
 * description, cover image, category); its price/stock are derived,
 * read-only projections of its `isDefault` variant (`defaultPrice`/
 * `variantCount` on `ProductOutput`), never edited from this form.
 */
export const productFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	coverImage: z.union([z.literal(""), z.url("Must be a valid URL")]).optional(),
	categoryId: z.string().optional(),
	isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
