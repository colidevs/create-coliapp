import { describe, expect, it } from "vitest";

import { createOrdersStore, defaultSeed } from "@/mocks/data/orders";

/**
 * Coverage for the tenant-scoping invariant the "Tenant switch scopes data"
 * spec scenario depends on (`kumo-console-template` Phase 3) — every
 * operation is exercised against BOTH seeded tenants to prove one tenant's
 * requests never see or mutate the other's rows, not just that each
 * operation works in isolation.
 */
describe("createOrdersStore — tenant scoping", () => {
	it("list() only ever returns the requested tenant's rows", () => {
		const store = createOrdersStore();

		const acme = store.list("tenant_acme");
		const beta = store.list("tenant_beta");

		expect(acme.items.length).toBeGreaterThan(0);
		expect(acme.items.every((order) => order.tenantId === "tenant_acme")).toBe(
			true,
		);
		expect(beta.items.every((order) => order.tenantId === "tenant_beta")).toBe(
			true,
		);
	});

	it("list() for an unknown tenant returns an empty page, never another tenant's rows", () => {
		const store = createOrdersStore();

		expect(store.list("tenant_unknown")).toEqual({
			items: [],
			nextCursor: null,
		});
	});

	it("get() never resolves an order id that belongs to a different tenant", () => {
		const store = createOrdersStore();
		const [acmeOrder] = defaultSeed().filter(
			(order) => order.tenantId === "tenant_acme",
		);

		expect(store.get("tenant_beta", acmeOrder.id)).toBeUndefined();
		expect(store.get("tenant_acme", acmeOrder.id)).toEqual(acmeOrder);
	});

	it("create() scopes the new row to the given tenant only", () => {
		const store = createOrdersStore();

		const created = store.create("tenant_beta", "New beta order");

		expect(created.tenantId).toBe("tenant_beta");
		expect(store.get("tenant_acme", created.id)).toBeUndefined();
		expect(store.get("tenant_beta", created.id)).toEqual(created);
	});

	it("update() never mutates a row scoped to a different tenant", () => {
		const store = createOrdersStore();
		const [acmeOrder] = defaultSeed().filter(
			(order) => order.tenantId === "tenant_acme",
		);

		const result = store.update("tenant_beta", acmeOrder.id, {
			name: "Hijacked",
		});

		expect(result).toBeUndefined();
		expect(store.get("tenant_acme", acmeOrder.id)?.name).toBe(acmeOrder.name);
	});

	it("update() applies the patch when the tenant matches", () => {
		const store = createOrdersStore();
		const [acmeOrder] = defaultSeed().filter(
			(order) => order.tenantId === "tenant_acme",
		);

		const result = store.update("tenant_acme", acmeOrder.id, {
			name: "Renamed",
		});

		expect(result?.name).toBe("Renamed");
	});

	it("remove() never deletes a row scoped to a different tenant", () => {
		const store = createOrdersStore();
		const [acmeOrder] = defaultSeed().filter(
			(order) => order.tenantId === "tenant_acme",
		);

		const removed = store.remove("tenant_beta", acmeOrder.id);

		expect(removed).toBe(false);
		expect(store.get("tenant_acme", acmeOrder.id)).toBeDefined();
	});

	it("remove() deletes the row when the tenant matches", () => {
		const store = createOrdersStore();
		const [acmeOrder] = defaultSeed().filter(
			(order) => order.tenantId === "tenant_acme",
		);

		expect(store.remove("tenant_acme", acmeOrder.id)).toBe(true);
		expect(store.get("tenant_acme", acmeOrder.id)).toBeUndefined();
	});

	it("paginates within one tenant using the returned nextCursor", () => {
		const store = createOrdersStore();

		const firstPage = store.list("tenant_acme", { limit: 2 });
		expect(firstPage.items).toHaveLength(2);
		expect(firstPage.nextCursor).not.toBeNull();

		const secondPage = store.list("tenant_acme", {
			limit: 2,
			cursor: firstPage.nextCursor ?? undefined,
		});
		expect(
			secondPage.items.every((order) => order.tenantId === "tenant_acme"),
		).toBe(true);
		expect(
			secondPage.items.some((order) =>
				firstPage.items.some((f) => f.id === order.id),
			),
		).toBe(false);
	});

	it("filters by name within the requested tenant only", () => {
		const store = createOrdersStore();

		const result = store.list("tenant_acme", { filter: 'name : "Gadget"' });

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.name).toContain("Gadget");
	});
});
