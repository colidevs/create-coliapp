import { describe, expect, it } from "vitest";

import { defineAbilityFor } from "@/lib/ability";

describe("defineAbilityFor", () => {
	it("grants manage on every catalog subject plus read-only Order for admin", () => {
		const ability = defineAbilityFor("admin");

		expect(ability.can("manage", "Category")).toBe(true);
		expect(ability.can("manage", "Product")).toBe(true);
		expect(ability.can("manage", "ProductImage")).toBe(true);
		expect(ability.can("manage", "Stock")).toBe(true);
		expect(ability.can("read", "Order")).toBe(true);
		expect(ability.can("update", "Order")).toBe(false);
		expect(ability.can("manage", "Variant")).toBe(true);
		expect(ability.can("manage", "VariantOptionType")).toBe(true);
	});

	it("grants read-only catalog access and no Order access for viewer", () => {
		const ability = defineAbilityFor("viewer");

		expect(ability.can("read", "Category")).toBe(true);
		expect(ability.can("read", "Product")).toBe(true);
		expect(ability.can("read", "ProductImage")).toBe(true);
		expect(ability.can("read", "Stock")).toBe(true);
		expect(ability.can("update", "Category")).toBe(false);
		expect(ability.can("read", "Variant")).toBe(true);
		expect(ability.can("read", "VariantOptionType")).toBe(true);
		expect(ability.can("manage", "Variant")).toBe(false);
		// Order carries buyer PII — deliberately not granted to viewer at all,
		// mirroring apps/api's own asymmetric grant (src/lib/ability.ts).
		expect(ability.can("read", "Order")).toBe(false);
	});
});
