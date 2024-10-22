import type {QueryResponse} from "./types";

export const {STRAPI_HOST, STRAPI_TOKEN} = process.env;


/**
 * Fetch data from the Strapi API.
 *
 * @example
 * query("posts").then((res) => console.log(res.data));
 *
 * @example
 * query("posts?populate=images").then((res) => console.log(res.data.images));
 *
 * @param path - The path to the Strapi API endpoint
 * @returns `QueryResponse<T>` - The data and metadata from the Strapi API
 */
export async function query<T>(path: string): Promise<QueryResponse<T>> {
  return fetch(`${STRAPI_HOST}/api/${path}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
  }).then((res) => {
    return res.json();
  });
}

/**
 * Get the URL for a Strapi API path.
 *
 * @example
 * getStrapiURL("/posts") => "http://localhost:1337/posts"
 *
 * @example
 * getStrapiURL(image.url) => "http://localhost:1337/content/1123123"
 *
 * @param path - The path to content in the Strapi API
 * @returns `strin` - The URL wrapped in the `STRAPI_HOST` environment variable
 */
export function getStrapiURL(path: string): string {
  return `${STRAPI_HOST}${path}`;
}
