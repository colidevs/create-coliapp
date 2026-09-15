import { type ClassValue, clsx } from "clsx";
import slugify from "slugify";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toSlug(str: string): string {
	return slugify(str, { lower: true });
}

export function isEmptyObject(obj: object) {
	return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Ported from munod (`munod/www/src/lib/utils.ts`). The `NODE_ENV` branch is
 * munod's own, kept as-is: `es-AR` locale formatting in development only,
 * default locale otherwise — a deliberate, pre-existing inconsistency in the
 * source this template ports from, not introduced here.
 */
export function formatDate(dateString: string) {
	if (process.env.NODE_ENV === "development") {
		return new Date(dateString).toLocaleString("es-AR");
	}

	return new Date(dateString).toLocaleString();
}

export function formatDimensions(size: string | null | undefined): string {
	const parts = (size ?? "")
		.split("*")
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length !== 3) return size || "-";

	return `${parts.join(" × ")} cm`;
}

export function toList(value: string): string[] {
	return value
		.split(",")
		.map((opt) => opt.trim())
		.filter((opt) => opt.length > 0);
}

/**
 * `@tanstack/react-form`'s `field.state.meta.errors` array mixes two shapes:
 * plain strings (set via `form.setFieldMeta`'s `errorMap.onSubmit`, this
 * template's own server-error bridge — see `modules/products/form.tsx`) and
 * Standard Schema issue objects `{ message, path? }` (produced automatically
 * when a Zod schema is passed directly as a `validators.onChange`/`onSubmit`
 * value — confirmed live via Playwright: rendering the raw array entry
 * produced `[object Object]`, not the issue's own message text).
 * `colidevs/hefesto#104`.
 */
export function fieldErrorMessage(errors: unknown[]): string | undefined {
	const [first] = errors;
	if (first === undefined) return undefined;
	if (typeof first === "string") return first;
	if (
		typeof first === "object" &&
		first !== null &&
		"message" in first &&
		typeof first.message === "string"
	) {
		return first.message;
	}
	return String(first);
}

export function extractObjectName(url: string, folder: string): string | null {
	try {
		const { pathname } = new URL(url);

		const parts = pathname.split("/");

		const folderIndex = parts.indexOf(folder);
		if (folderIndex === -1) return null;

		const objectName = parts.slice(folderIndex).join("/");

		return decodeURIComponent(objectName);
	} catch {
		return null;
	}
}
