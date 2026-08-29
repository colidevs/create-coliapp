/**
 * @description ADR 0009 (`api-communication-standard.md`): "Cursor-based
 * (next_cursor/page_token) by default. Offset/page only for small, static,
 * bounded tables — as a documented exception." Fires only when a response
 * schema carries a `pagination` object property (list-endpoint shape) — the
 * seed spec ships no such endpoint yet, so this rule is dormant until the
 * first real, Apidog-designed list endpoint lands; it exists now so CI
 * catches drift the moment one is added, per this PR's "lint-tool-checkable
 * slice" scope.
 */
export default function cursorPaginationShape(schema) {
	const paginationSchema = schema?.properties?.pagination;

	if (!paginationSchema) {
		return;
	}

	const props = paginationSchema.properties ?? {};
	const hasCursorField = "next_cursor" in props || "page_token" in props;

	if (!hasCursorField) {
		return [
			{
				message:
					"Paginated response schemas must use cursor-based pagination (next_cursor/page_token) by default — offset/page pagination needs a documented exception (ADR 0009).",
			},
		];
	}
}
