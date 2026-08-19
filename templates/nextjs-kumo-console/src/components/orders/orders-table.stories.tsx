import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { Order } from "@/generated/orders/model";
import { OrdersTable } from "./orders-table.client";

/**
 * Storybook stories for the compound `Table.*` leaf (task from Phase 4 —
 * component tests + living documentation, per testing-methodology.md /
 * frontend-accessibility-baseline.md's `@storybook/addon-a11y`). Purely
 * presentational (`orders-table.client.tsx`'s own doc comment): no Server
 * Action, no fetch — safe to render and interact with entirely inside
 * Storybook's browser test environment.
 */
const meta = {
	title: "Orders/OrdersTable",
	component: OrdersTable,
	args: {
		onEdit: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof OrdersTable>;

export default meta;

type Story = StoryObj<typeof meta>;

const sampleOrders: Order[] = [
	{
		id: "order_acme_0001",
		tenantId: "tenant_acme",
		name: "Acme — Widget batch #1",
		createdAt: "2026-08-01T09:00:00.000Z",
	},
	{
		id: "order_acme_0002",
		tenantId: "tenant_acme",
		name: "Acme — Gadget restock",
		createdAt: "2026-08-03T09:00:00.000Z",
	},
];

export const WithOrders: Story = {
	args: {
		orders: sampleOrders,
	},
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);

		expect(canvas.getByText("Acme — Widget batch #1")).toBeInTheDocument();
		expect(canvas.getByText("Acme — Gadget restock")).toBeInTheDocument();

		const [firstEditButton] = canvas.getAllByRole("button", { name: "Edit" });
		await userEvent.click(firstEditButton);

		expect(args.onEdit).toHaveBeenCalledWith(sampleOrders[0]);
	},
};

export const Empty: Story = {
	args: {
		orders: [],
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		expect(
			canvas.getByText("No orders yet for this tenant."),
		).toBeInTheDocument();
	},
};
