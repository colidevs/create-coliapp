import type { Response } from "express";
import { z } from "zod";

export interface ResponseWithContext extends Response {
	locals: Response["locals"] & { context: string };
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
