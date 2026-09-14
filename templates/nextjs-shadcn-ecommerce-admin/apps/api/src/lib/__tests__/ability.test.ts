import { describe, expect, it } from "vitest";
import { assertCan, defineAbilityFor } from "@/lib/ability";
import { ForbiddenHttpError } from "@/v1/res/errors";

describe("defineAbilityFor", () => {
	it("grants admin manage over every catalog subject", () => {
		const ability = defineAbilityFor("admin");

		expect(ability.can("create", "Product")).toBe(true);
		expect(ability.can("update", "Category")).toBe(true);
		expect(ability.can("delete", "ProductImage")).toBe(true);
		expect(ability.can("update", "Stock")).toBe(true);
		expect(ability.can("update", "Variant")).toBe(true);
		expect(ability.can("delete", "VariantOptionType")).toBe(true);
	});

	it("grants viewer read-only access", () => {
		const ability = defineAbilityFor("viewer");

		expect(ability.can("read", "Product")).toBe(true);
		expect(ability.can("create", "Product")).toBe(false);
		expect(ability.can("update", "Category")).toBe(false);
		expect(ability.can("delete", "ProductImage")).toBe(false);
		expect(ability.can("read", "Variant")).toBe(true);
		expect(ability.can("read", "VariantOptionType")).toBe(true);
		expect(ability.can("update", "Variant")).toBe(false);
		expect(ability.can("delete", "VariantOptionType")).toBe(false);
	});

	it("grants admin read over Order, but never viewer (buyer PII)", () => {
		const admin = defineAbilityFor("admin");
		const viewer = defineAbilityFor("viewer");

		expect(admin.can("read", "Order")).toBe(true);
		expect(viewer.can("read", "Order")).toBe(false);
	});
});

describe("assertCan", () => {
	it("does not throw when the ability allows the action", () => {
		const ability = defineAbilityFor("admin");

		expect(() => assertCan(ability, "create", "Product")).not.toThrow();
	});

	it("throws ForbiddenHttpError (403) when the ability denies the action", () => {
		const ability = defineAbilityFor("viewer");

		expect(() => assertCan(ability, "create", "Product")).toThrow(
			ForbiddenHttpError,
		);
	});
});
