import { z } from "zod";

import type {
	Category,
	CategoryCreate,
	CategoryUpdate,
} from "@/generated/model";

export type { Category, CategoryCreate, CategoryUpdate };

/**
 * Client-side validation schema for `form.tsx` (React Hook Form +
 * `zodResolver`, `console-golden-path.md` decision 5) — mirrors
 * `apps/api`'s `CategoryCreateSchema`/`CategoryUpdateSchema`
 * (`admin/categories/types.ts`) but is authored independently: this is a
 * separate deployable (ADR 0029, no shared `packages/*`), so the same shape
 * is deliberately duplicated here, not imported.
 */
export const categoryFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
