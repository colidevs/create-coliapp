import slugify from "slugify";

export function toBoolean(value: string): boolean {
  return value.trim().toUpperCase() === "TRUE";
}

export function toSlug(str: string): string {
  return slugify(str, {lower: true});
}

export function toList(value: string): string[] {
  return value
    .split(",")
    .map((opt) => opt.trim())
    .filter((opt) => opt.length > 0);
}

export function parseNumber(value: string): number {
  const num = Number(value.trim());

  return isNaN(num) ? 0 : num;
}

export function parsePrice(value: string): number {
  const justNumbers = value.replace(/\$/g, "").replace(/,/g, "").trim();

  const num = Number(justNumbers);

  return isNaN(num) ? 0 : num;
}

export function parseDiscount(value: string): number {
  const cleaned = value.replace("%", "").trim();
  const num = Number(cleaned);

  return isNaN(num) ? 0 : num;
}

export function getStorageId(url: string): string {
  const regex = /\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);

  const id = match ? match[1] : null;

  if (id === null) throw new Error(`Error trying to get 'storage id' from: ${url}`);

  return id;
}
