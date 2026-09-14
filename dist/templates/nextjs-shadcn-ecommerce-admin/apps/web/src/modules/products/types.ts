import { z } from "zod";

import type {
	ListProductsParams,
	ProductCreate,
	ProductOutput,
	ProductUpdate,
} from "@/generated/model";

export type { ListProductsParams, ProductCreate, ProductUpdate };
/** `ProductOutput` (the response shape) aliased as `Product` — the module's own conventional name, matching `categories`/`product-images`. */
export type Product = ProductOutput;

/**
 * Client-side validation schema for `form.tsx` (React Hook Form +
 * `zodResolver`) — mirrors `apps/api`'s `ProductCreateSchema`/
 * `ProductUpdateSchema` (`admin/products/types.ts`), authored independently
 * per the same reasoning as `modules/categories/types.ts`.
 */
export const productFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	code: z.string().optional(),
	altCode: z.string().optional(),
	description: z.string().optional(),
	// Plain `z.number()`, not `z.coerce.number()` — see
	// `modules/product-images/types.ts`'s identical note: keeps input/output
	// types identical so `useForm<ProductFormValues>` type-checks under
	// ADR 0030's `exactOptionalPropertyTypes` floor. Numeric `<Input>`s
	// register with RHF's own `valueAsNumber: true` instead.
	price: z.number().positive("Price must be greater than 0"),
	stock: z.number().int().min(0).optional(),
	stockMin: z.number().int().min(0).optional(),
	coverImage: z.union([z.literal(""), z.url("Must be a valid URL")]).optional(),
	categoryId: z.string().optional(),
	isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
