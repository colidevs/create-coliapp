/**
 * @description No new schema is defined here — public storefront reads reuse
 * `admin/categories`'s own `.meta({id: "Category"})`-registered schema
 * (`@/v1/modules/admin/categories/types`), a GLOBAL OpenAPI component id
 * (`z.globalRegistry`, ADR 0040) that a second definition here would
 * collide with. This file exists only for parity with this template's
 * module-file-set convention (`controller/service/repository/route/types/
 * injection/index`); see `./repository.ts` for the actual reuse.
 */
export type { Category } from "@/v1/modules/admin/categories/types";
