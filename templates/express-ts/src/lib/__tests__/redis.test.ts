import { describe, expect, it } from "vitest";
import { tenantCacheKey } from "@/lib/redis";
import { RequiredError } from "@/v1/res/errors";

describe("tenantCacheKey", () => {
	it("includes the tenant ID as a mandatory key dimension", () => {
		const key = tenantCacheKey({
			tenantId: "tenant-a",
			resource: "orders",
			dims: ["123"],
		});

		expect(key).toContain("tenant-a");
	});

	it("gives two tenants distinct keys for the same resource/id", () => {
		const keyTenantA = tenantCacheKey({
			tenantId: "tenant-a",
			resource: "orders",
			dims: ["123", "/api/v1/orders/123"],
		});

		const keyTenantB = tenantCacheKey({
			tenantId: "tenant-b",
			resource: "orders",
			dims: ["123", "/api/v1/orders/123"],
		});

		expect(keyTenantA).not.toEqual(keyTenantB);
	});

	it("never contains the hardcoded legacy product prefix", () => {
		const key = tenantCacheKey({
			tenantId: "tenant-a",
			resource: "orders",
			dims: ["123", "/api/v1/orders/123"],
		});

		expect(key).not.toContain("colitienda:");
	});

	it("rejects an empty tenant ID instead of silently building a shared key", () => {
		expect(() =>
			tenantCacheKey({ tenantId: "", resource: "orders", dims: ["123"] }),
		).toThrow(RequiredError);
	});

	it("builds a key with no dims when none are provided", () => {
		const key = tenantCacheKey({ tenantId: "tenant-a", resource: "orders" });

		expect(key).toBe("tenant-a:orders");
	});
});
