import type { Request, Response } from "express";
import { z } from "zod";

export interface RequestWithId extends Request {
	params: Request["params"] & { id: string };
}

export interface ResponseWithContext extends Response {
	locals: Response["locals"] & { context: string };
}

/**
 * @description Request typed with an optional `:id` route param, used by
 * the cache middleware and `tenantCacheKey` to build per-resource cache
 * dimensions. Previously imported across `lib/redis.ts` and
 * `v1/middlewares/{cache,context}.ts` without ever being defined here —
 * `tsc --noEmit` failed independent of any Phase 3 change (flagged during
 * Phase 1 apply, fixed here).
 */
export interface RequestWithId extends Request {
	params: Request["params"] & { id?: string };
}

export interface AppResponse<TData> {
	data: TData;
}

export const PaginationSchema = z.object({
	count: z.number(),
	next: z.number(),
	page: z.number(),
	previous: z.number(),
	size: z.number(),
	total: z.number(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = z.object({
	data: z.array(
		z.union([
			z.array(z.any()),
			z.boolean(),
			z.number(),
			z.number(),
			z.record(z.string(), z.any()),
			z.null(),
			z.string(),
		]),
	),
	message: z.string(),
	pagination: PaginationSchema,
	success: z.boolean(),
});
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

export const SuccessResponseSchema = z.object({
	data: z.union([
		z.array(
			z.union([
				z.array(z.any()),
				z.boolean(),
				z.number(),
				z.number(),
				z.record(z.string(), z.any()),
				z.null(),
				z.string(),
			]),
		),
		z.record(z.string(), z.any()),
	]),
	message: z.string(),
	success: z.boolean(),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

export const ErrorResponseSchema = z.object({
	error: z.union([z.record(z.string(), z.any()), z.null()]),
	message: z.string(),
	success: z.boolean(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
