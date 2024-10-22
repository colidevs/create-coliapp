import {z} from "zod";

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  pageCount: z.number(),
  total: z.number(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const metaSchema = z.object({
  pagination: paginationSchema.optional(),
});

export type Meta = z.infer<typeof metaSchema>;


export type QueryResponse<T> = {
  data: T;
  meta: Meta
};

//#region Image from Strapi
export interface ImageDTO {
  id: number;
  documentId: string;
  name: string;
  alternativeText: null;
  caption: null;
  width: number;
  height: number;
  formats: Formats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: null;
  provider: string;
  provider_metadata: null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}

export interface Formats {
  large: Large;
  small: Large;
  medium: Large;
  thumbnail: Large;
}

export interface Large {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: null;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}
//#endregion

export const imageSchema = z.object({
  id: z.number(),
  url: z.string(),
  alt: z.string(),
});
export type Image = z.infer<typeof imageSchema>;
