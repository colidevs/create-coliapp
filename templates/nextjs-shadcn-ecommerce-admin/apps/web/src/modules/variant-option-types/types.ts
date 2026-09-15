import { z } from "zod";

import type {
	VariantOptionType,
	VariantOptionTypeCreate,
	VariantOptionTypeUpdate,
} from "@/generated/model";

export type {
	VariantOptionType,
	VariantOptionTypeCreate,
	VariantOptionTypeUpdate,
};

/**
 * Client-side validation schema for `form.tsx` (React Hook Form +
 * `zodResolver`, `console-golden-path.md` decision 5) — mirrors
 * `apps/api`'s `VariantOptionTypeCreateSchema`/`VariantOptionTypeUpdateSchema`
 * (`admin/variant-option-types/types.ts`) but is authored independently: this
 * is a separate deployable (ADR 0029, no shared `packages/*`), so the same
 * shape is deliberately duplicated here, not imported. `slug` is server-
 * derived from `name` (design: "`slug` is derived from `name`") — never a
 * form field.
 */
export const variantOptionTypeFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	displayOrder: z.number().int().optional(),
	isActive: z.boolean(),
});

export type VariantOptionTypeFormValues = z.infer<
	typeof variantOptionTypeFormSchema
>;
