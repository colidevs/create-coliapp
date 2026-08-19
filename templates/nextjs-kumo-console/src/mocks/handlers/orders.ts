import { HttpResponse, http } from "msw";

import { ACTIVE_TENANT_HEADER } from "@/lib/session";
import { ordersStore } from "@/mocks/data/orders";

/**
 * Phase 3's own MSW handler set for the `orders` module — deliberately kept
 * out of Phase 2's `src/mocks/handlers.ts` (that file's own comment says not
 * to extend it for this module). Composed alongside the session handlers in
 * `src/mocks/node.ts`.
 *
 * Tenant resolution/enforcement: every handler below reads the
 * `x-active-tenant` header `src/lib/api/server-client.ts`'s `apiRequest`
 * mutator sets from `verifySession()`'s own resolved `activeTenantId` — never
 * a client-suppliable value picked out of thin air, and never something this
 * layer trusts a request body/query param for. `src/mocks/data/orders.ts`'s
 * `ordersStore` then scopes every read/write to that tenant. This is the
 * server-side enforcement the "Tenant switch scopes data" spec scenario
 * requires: a request with no (or a wrong) `x-active-tenant` header simply
 * never sees another tenant's rows, regardless of what a compromised or
 * buggy client might ask for.
 */

function problem(
	status: number,
	title: string,
	detail?: string,
	errors?: { field: string; detail: string }[],
) {
	return HttpResponse.json(
		{
			type: "about:blank",
			status,
			title,
			...(detail ? { detail } : {}),
			...(errors ? { errors } : {}),
		},
		{ status },
	);
}

function resolveActiveTenant(request: Request): string | null {
	return request.headers.get(ACTIVE_TENANT_HEADER);
}

function validateName(name: unknown): string | null {
	if (typeof name !== "string" || name.trim().length === 0) {
		return null;
	}

	return name.trim();
}

export const ordersHandlers = [
	http.get("*/api/v1/orders", ({ request }) => {
		const tenantId = resolveActiveTenant(request);

		if (!tenantId) {
			return problem(401, "Unauthorized", "No active tenant context.");
		}

		const url = new URL(request.url);
		const cursor = url.searchParams.get("cursor") ?? undefined;
		const limitParam = url.searchParams.get("limit");
		const filter = url.searchParams.get("filter") ?? undefined;
		const sort = url.searchParams.get("sort") ?? undefined;

		const { items, nextCursor } = ordersStore.list(tenantId, {
			cursor,
			limit: limitParam ? Number(limitParam) : undefined,
			filter,
			sort,
		});

		return HttpResponse.json(
			{ items, next_cursor: nextCursor },
			{ status: 200 },
		);
	}),

	http.post("*/api/v1/orders", async ({ request }) => {
		const tenantId = resolveActiveTenant(request);

		if (!tenantId) {
			return problem(401, "Unauthorized", "No active tenant context.");
		}

		const body = (await request.json().catch(() => null)) as {
			name?: unknown;
		} | null;
		const name = validateName(body?.name);

		if (name === null) {
			return problem(422, "Unprocessable Entity", "Validation failed.", [
				{ field: "name", detail: "Name must not be empty." },
			]);
		}

		const created = ordersStore.create(tenantId, name);

		return HttpResponse.json(created, {
			status: 201,
			headers: { Location: `/api/v1/orders/${created.id}` },
		});
	}),

	http.get("*/api/v1/orders/:orderId", ({ request, params }) => {
		const tenantId = resolveActiveTenant(request);

		if (!tenantId) {
			return problem(401, "Unauthorized", "No active tenant context.");
		}

		const order = ordersStore.get(tenantId, params.orderId as string);

		if (!order) {
			return problem(404, "Not Found", "Order not found.");
		}

		return HttpResponse.json(order, { status: 200 });
	}),

	http.patch("*/api/v1/orders/:orderId", async ({ request, params }) => {
		const tenantId = resolveActiveTenant(request);

		if (!tenantId) {
			return problem(401, "Unauthorized", "No active tenant context.");
		}

		const body = (await request.json().catch(() => null)) as {
			name?: unknown;
		} | null;

		if (body?.name !== undefined && validateName(body.name) === null) {
			return problem(422, "Unprocessable Entity", "Validation failed.", [
				{ field: "name", detail: "Name must not be empty." },
			]);
		}

		const updated = ordersStore.update(tenantId, params.orderId as string, {
			name:
				body?.name !== undefined
					? (validateName(body.name) ?? undefined)
					: undefined,
		});

		if (!updated) {
			return problem(404, "Not Found", "Order not found.");
		}

		return HttpResponse.json(updated, { status: 200 });
	}),

	http.delete("*/api/v1/orders/:orderId", ({ request, params }) => {
		const tenantId = resolveActiveTenant(request);

		if (!tenantId) {
			return problem(401, "Unauthorized", "No active tenant context.");
		}

		const removed = ordersStore.remove(tenantId, params.orderId as string);

		if (!removed) {
			return problem(404, "Not Found", "Order not found.");
		}

		return new HttpResponse(null, { status: 204 });
	}),
];
