/**
 * @description ADR 0009 (`api-communication-standard.md`) naming convention:
 * plural-noun resources. Heuristic, not a full NLP check: a path segment
 * passes if it ends in "s", is a `{param}` placeholder, or is on the
 * exemption list for action-style/infra endpoints that are not REST
 * resource collections (`healthcheck`, `status` — mirrors `/health`/`/ready`,
 * which are intentionally outside this OpenAPI document altogether, see
 * `src/v1/modules/health/route.ts`).
 */
const EXEMPT_SEGMENTS = new Set(["health", "healthcheck", "ready", "status"]);

export default function pluralNounPath(paths) {
	const results = [];

	for (const pathKey of Object.keys(paths ?? {})) {
		const segments = pathKey.split("/").filter(Boolean);

		for (const segment of segments) {
			if (segment.startsWith("{") || EXEMPT_SEGMENTS.has(segment)) {
				continue;
			}

			if (!segment.endsWith("s")) {
				results.push({
					message: `Path segment "${segment}" in "${pathKey}" should be a plural noun (ADR 0009 naming), or added to this rule's exemption list if it is an action-style/utility endpoint.`,
					path: ["paths", pathKey],
				});
			}
		}
	}

	return results.length > 0 ? results : undefined;
}
