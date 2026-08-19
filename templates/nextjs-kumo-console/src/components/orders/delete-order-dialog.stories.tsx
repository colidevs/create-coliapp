import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { Order } from "@/generated/orders/model";
import { DeleteOrderDialog } from "./delete-order-dialog.client";

/**
 * Storybook stories for the confirmation `Dialog.*` leaf. Deliberately never
 * clicks the destructive "Delete" button in a `play` function: that button
 * is bound to the real `deleteOrderAction` Server Action
 * (`src/app/(console)/orders/actions.ts`), which needs a running backend
 * (MSW or `express-ts`) to resolve — out of scope for a component-level
 * story. Full create/update/delete flows are Playwright E2E's job
 * (`e2e/orders-crud.spec.ts`), run against the same MSW handlers this
 * template already ships. This story only proves rendering and the
 * non-mutating "Cancel" interaction.
 */
const sampleOrder: Order = {
	id: "order_acme_0001",
	tenantId: "tenant_acme",
	name: "Acme — Widget batch #1",
	createdAt: "2026-08-01T09:00:00.000Z",
};

const meta = {
	title: "Orders/DeleteOrderDialog",
	component: DeleteOrderDialog,
	args: {
		onOpenChange: fn(),
		onSuccess: fn(),
	},
} satisfies Meta<typeof DeleteOrderDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
	args: {
		order: sampleOrder,
	},
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement.ownerDocument.body);

		expect(canvas.getByText("Delete order?")).toBeInTheDocument();
		expect(canvas.getByText(/Acme — Widget batch #1/)).toBeInTheDocument();

		await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));

		// Kumo's Dialog.Root also passes a second, event-details argument —
		// only the first (the open/closed boolean) is this test's concern.
		expect(args.onOpenChange).toHaveBeenCalledWith(false, expect.anything());
	},
};
