/**
 * In-memory, tenant-scoped `orders` mock data store for MSW
 * (`src/mocks/handlers/orders.ts`) — Phase 3's own infrastructure, extending
 * what Phase 2 started (`src/mocks/handlers.ts`, `src/mocks/data/session.ts`)
 * without touching either file.
 *
 * Every function here takes an explicit `tenantId` and only ever reads or
 * writes that tenant's own slice of the store — this is what makes the
 * spec's "Tenant switch scopes data" scenario genuinely enforced
 * server-side (by this module, standing in for a real backend's own
 * `tenant_id`-scoped query) rather than merely client-filtered. Deliberately
 * framework-free (no MSW/Next imports) so it is directly unit-testable —
 * see `src/mocks/data/orders.test.ts`.
 */

export interface OrderRecord {
	id: string;
	tenantId: string;
	name: string;
	createdAt: string;
}

export interface ListOrdersOptions {
	cursor?: string;
	limit?: number;
	filter?: string;
	sort?: string;
}

export interface ListOrdersResult {
	items: OrderRecord[];
	nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;

let sequence = 0;

function nextId(tenantId: string): string {
	sequence += 1;
	return `order_${tenantId}_${sequence.toString().padStart(4, "0")}`;
}

/**
 * Seed data for the two tenants Phase 2's mocked session
 * (`src/mocks/data/session.ts`) already grants membership in
 * (`tenant_acme`, `tenant_beta`) — enough rows per tenant to make pagination
 * and tenant-scoping both observable.
 */
export function defaultSeed(): OrderRecord[] {
	return [
		{
			id: "order_acme_0001",
			tenantId: "tenant_acme",
			name: "Acme — Widget batch #1",
			createdAt: "2026-08-01T09:00:00.000Z",
		},
		{
			id: "order_acme_0002",
			tenantId: "tenant_acme",
			name: "Acme — Widget batch #2",
			createdAt: "2026-08-02T09:00:00.000Z",
		},
		{
			id: "order_acme_0003",
			tenantId: "tenant_acme",
			name: "Acme — Gadget restock",
			createdAt: "2026-08-03T09:00:00.000Z",
		},
		{
			id: "order_beta_0001",
			tenantId: "tenant_beta",
			name: "Beta — Launch order",
			createdAt: "2026-08-01T10:00:00.000Z",
		},
		{
			id: "order_beta_0002",
			tenantId: "tenant_beta",
			name: "Beta — Follow-up order",
			createdAt: "2026-08-04T10:00:00.000Z",
		},
	];
}

/**
 * A minimal, self-contained interpreter for the same flat, `AND`-only
 * comparator subset `api-communication-standard.md`'s AIP-160 grammar
 * describes — deliberately NOT a reuse of `@colidevs/utils`'s
 * `parseAip160Filter` (that package is the *frontend's* wire-format bridge,
 * `src/lib/filter-param.ts`; a real backend implements its own filter
 * parser independently of whatever codegen/frontend tooling produced the
 * query string — "the backend parser enforces correctness, not the
 * OpenAPI/codegen layer", per that same rule). Only the `name` field is
 * supported, matching this template's one mock resource.
 */
function matchesFilter(
	order: OrderRecord,
	filter: string | undefined,
): boolean {
	if (!filter || filter.trim().length === 0) {
		return true;
	}

	return filter.split(/\s+AND\s+/i).every((rawClause) => {
		const match = rawClause.trim().match(/^name\s*(=|!=|:)\s*"?([^"]*)"?$/i);

		if (!match) {
			// Outside this mock's deliberately narrow support — never matches,
			// mirroring `parseAip160Filter`'s own "reject, don't guess" posture.
			return false;
		}

		const [, comparator, rawValue] = match;
		const value = rawValue.toLowerCase();
		const name = order.name.toLowerCase();

		switch (comparator) {
			case "=":
				return name === value;
			case "!=":
				return name !== value;
			case ":":
				return name.includes(value);
			default:
				return false;
		}
	});
}

function applySort(
	orders: OrderRecord[],
	sort: string | undefined,
): OrderRecord[] {
	if (!sort) {
		return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}

	const fields = sort.split(",").map((field) => field.trim());

	return [...orders].sort((a, b) => {
		for (const field of fields) {
			const descending = field.startsWith("-");
			const key = (descending ? field.slice(1) : field) as keyof OrderRecord;
			const left = a[key];
			const right = b[key];

			if (left === right) {
				continue;
			}

			const comparison = String(left).localeCompare(String(right));
			return descending ? -comparison : comparison;
		}

		return 0;
	});
}

export interface OrdersStore {
	list(tenantId: string, options?: ListOrdersOptions): ListOrdersResult;
	get(tenantId: string, orderId: string): OrderRecord | undefined;
	create(tenantId: string, name: string): OrderRecord;
	update(
		tenantId: string,
		orderId: string,
		patch: { name?: string },
	): OrderRecord | undefined;
	remove(tenantId: string, orderId: string): boolean;
}

/**
 * Factory, not a bare module-scope object — lets tests
 * (`src/mocks/data/orders.test.ts`) construct fully isolated stores instead
 * of sharing mutable state across test cases. `src/mocks/handlers/orders.ts`
 * uses the single `ordersStore` instance exported below for the actual MSW
 * server.
 */
export function createOrdersStore(
	seed: OrderRecord[] = defaultSeed(),
): OrdersStore {
	const records: OrderRecord[] = seed.map((record) => ({ ...record }));

	function tenantRecords(tenantId: string): OrderRecord[] {
		return records.filter((record) => record.tenantId === tenantId);
	}

	return {
		list(tenantId, options = {}) {
			const { cursor, limit = DEFAULT_LIMIT, filter, sort } = options;

			const scoped = applySort(
				tenantRecords(tenantId).filter((record) =>
					matchesFilter(record, filter),
				),
				sort,
			);

			const startIndex = cursor
				? scoped.findIndex((record) => record.id === cursor) + 1
				: 0;

			// An unknown/stale cursor (findIndex === -1 → startIndex === 0) falls
			// back to the first page rather than throwing — the same forgiving
			// posture a real cursor-pagination backend takes on an expired token.
			const page = scoped.slice(startIndex, startIndex + limit);
			const hasMore = startIndex + limit < scoped.length;

			return {
				items: page,
				nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
			};
		},

		get(tenantId, orderId) {
			return tenantRecords(tenantId).find((record) => record.id === orderId);
		},

		create(tenantId, name) {
			const record: OrderRecord = {
				id: nextId(tenantId),
				tenantId,
				name,
				createdAt: new Date().toISOString(),
			};
			records.push(record);
			return record;
		},

		update(tenantId, orderId, patch) {
			const record = tenantRecords(tenantId).find((r) => r.id === orderId);

			if (!record) {
				return undefined;
			}

			if (patch.name !== undefined) {
				record.name = patch.name;
			}

			return record;
		},

		remove(tenantId, orderId) {
			const index = records.findIndex(
				(record) => record.tenantId === tenantId && record.id === orderId,
			);

			if (index === -1) {
				return false;
			}

			records.splice(index, 1);
			return true;
		},
	};
}

/** The single store instance `src/mocks/handlers/orders.ts` wires into MSW. */
export const ordersStore = createOrdersStore();
