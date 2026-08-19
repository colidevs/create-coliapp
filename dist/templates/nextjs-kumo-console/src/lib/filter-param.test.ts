import { describe, expect, it } from "vitest";

import { aip160FilterParser } from "@/lib/filter-param";

/**
 * Round-trip coverage for the local `nuqs` × AIP-160 wrapper (task 3.5,
 * `kumo-console-template` Phase 3) — proves `createParser`'s `parse`/
 * `serialize` are correctly wired to `@colidevs/utils`'s
 * `parseAip160Filter`/`serializeAip160Filter`, not that those underlying
 * functions are themselves correct (that's `@colidevs/utils`'s own test
 * suite's job).
 */
describe("aip160FilterParser", () => {
	it("parses a single clause", () => {
		expect(aip160FilterParser.parse('name = "Acme Corp"')).toEqual([
			{ field: "name", comparator: "=", value: "Acme Corp" },
		]);
	});

	it("round-trips serialize → parse back to the same filter", () => {
		const filter = [
			{ field: "name", comparator: "=" as const, value: "Acme Corp" },
			{ field: "status", comparator: "!=" as const, value: "cancelled" },
		];

		const serialized = aip160FilterParser.serialize(filter);
		expect(aip160FilterParser.parse(serialized)).toEqual(filter);
	});

	it("round-trips parse → serialize → parse for a wire-format query string", () => {
		const query = 'name : "widget" AND priority = 2';

		const parsed = aip160FilterParser.parse(query);
		expect(parsed).not.toBeNull();

		const reparsed = aip160FilterParser.parse(
			aip160FilterParser.serialize(parsed ?? []),
		);
		expect(reparsed).toEqual(parsed);
	});

	it("returns null (never throws) for out-of-v1-scope syntax", () => {
		expect(aip160FilterParser.parse('name = "a" OR name = "b"')).toBeNull();
	});

	it("treats an empty string as no filter", () => {
		expect(aip160FilterParser.parse("")).toEqual([]);
	});
});
