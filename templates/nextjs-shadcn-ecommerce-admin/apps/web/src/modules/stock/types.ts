import { z } from "zod";

import type {
	ListStockParams,
	StockItem,
	StockUpdate,
} from "@/generated/model";

export type { ListStockParams, StockUpdate };
/** `StockItem` aliased as `Stock` (module's own conventional name, matching `Product`/`Category`'s aliasing convention). */
export type Stock = StockItem;

/**
 * Client-side validation schema for `form.tsx` (`@tanstack/react-form`,
 * per-field `validators.onChange` — `colidevs/hefesto#104`) — mirrors
 * `apps/api`'s `StockUpdateSchema` (`admin/stock/types.ts`), authored
 * independently per the same reasoning as `modules/categories/types.ts`.
 * Plain `z.number()`, not `z.coerce.number()` — same
 * `exactOptionalPropertyTypes` note as `modules/products/types.ts`: keeps
 * input/output types identical under ADR 0030's floor. Numeric `<Input>`s
 * convert via the native `event.target.valueAsNumber` instead.
 */
export const stockUpdateFormSchema = z.object({
	stock: z.number().int().min(0, "Stock cannot be negative"),
	stockMin: z.number().int().min(0, "Cannot be negative"),
});

export type StockUpdateFormValues = z.infer<typeof stockUpdateFormSchema>;
