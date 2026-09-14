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
