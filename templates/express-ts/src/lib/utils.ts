import slugify from "slugify";

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toSlug(str: string): string {
	return slugify(str, {
		lower: true,
		trim: true,
		strict: true,
		replacement: "-",
	});
}

export function isEmpty(obj: object): boolean {
	return Object.keys(obj).length === 0;
}

export function removeLastSlashSymbol(str: string): string {
	return str.endsWith("/") ? str.slice(0, str.lastIndexOf("/")) : str;
}
