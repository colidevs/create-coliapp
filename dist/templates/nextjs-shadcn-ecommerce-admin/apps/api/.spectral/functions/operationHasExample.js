/**
 * @description ADR 0009 (`api-communication-standard.md`) OpenAPI completeness
 * bar: "≥1 example per schema" per operation. Accepts a media-type-level
 * `example`/`examples`, a schema-level `example`, or an `example` on any
 * direct property of the schema (the seed spec's own pattern — see
 * `openapi/openapi.yaml`'s `msg` property).
 */
export default function operationHasExample(responses) {
	const hasExample = Object.values(responses ?? {}).some((response) => {
		const contents = response?.content ?? {};

		return Object.values(contents).some((media) => {
			if (media?.example !== undefined) {
				return true;
			}

			if (media?.examples && Object.keys(media.examples).length > 0) {
				return true;
			}

			if (media?.schema?.example !== undefined) {
				return true;
			}

			const properties = media?.schema?.properties ?? {};
			return Object.values(properties).some(
				(property) => property?.example !== undefined,
			);
		});
	});

	if (!hasExample) {
		return [
			{
				message:
					"Operation must document at least one example, at the media-type, schema, or property level (ADR 0009 OpenAPI completeness).",
			},
		];
	}
}
