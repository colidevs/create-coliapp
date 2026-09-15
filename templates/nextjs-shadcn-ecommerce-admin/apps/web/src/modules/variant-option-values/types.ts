import { z } from "zod";

import type {
	ListVariantOptionValuesParams,
	VariantOptionValue,
	VariantOptionValueCreate,
	VariantOptionValueUpdate,
} from "@/generated/model";

export type {
	ListVariantOptionValuesParams,
	VariantOptionValue,
	VariantOptionValueCreate,
	VariantOptionValueUpdate,
};

/**
 * Client-side validation schema for `form.tsx`. `optionTypeId` is required
 * only on create (`VariantOptionValueForm`'s own required prop, not this
 * shared schema) — mirrors `modules/product-images/types.ts`'s own
 * `productId`-scoped convention exactly. `slug` is server-derived from
 * `value`, never a form field.
 */
export const variantOptionValueFormSchema = z.object({
	optionTypeId: z.uuid("Must be a valid option-type ID"),
	value: z.string().min(1, "Value is required"),
	imageUrl: z.union([z.url("Must be a valid URL"), z.literal("")]).optional(),
	description: z.string().optional(),
	displayOrder: z.number().int().optional(),
	isActive: z.boolean(),
});

export type VariantOptionValueFormValues = z.infer<
	typeof variantOptionValueFormSchema
>;
