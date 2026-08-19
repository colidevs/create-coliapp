import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { Order } from "@/generated/orders/model";
import { OrderFormDialog } from "./order-form-dialog.client";

/**
 * Storybook stories for the create/edit `Dialog.*` leaf. Like
 * `delete-order-dialog.stories.tsx`, these `play` functions never click
 * "Create"/"Save" — both modes are wired to real Server Actions
 * (`createOrderAction`/`updateOrderAction`) that need a running backend.
 * They cover rendering (create vs. edit default value) and the non-mutating
 * "type into the field" + "Cancel" interactions only. The full submit flow,
 * including the 422 validation-error path, is covered end-to-end by
 * Playwright (`e2e/orders-crud.spec.ts`, `e2e/orders-validation.spec.ts`).
 */
const sampleOrder: Order = {
	id: "order_acme_0001",
	tenantId: "tenant_acme",
	name: "Acme — Widget batch #1",
	createdAt: "2026-08-01T09:00:00.000Z",
};

const meta = {
	title: "Orders/OrderFormDialog",
	component: OrderFormDialog,
	args: {
		open: true,
		onOpenChange: fn(),
		onSuccess: fn(),
	},
} satisfies Meta<typeof OrderFormDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Create: Story = {
	args: {
		mode: "create",
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement.ownerDocument.body);

		expect(canvas.getByText("New order")).toBeInTheDocument();
		expect(canvas.getByLabelText("Name")).toHaveValue("");
	},
};

export const EditPrefillsExistingName: Story = {
	args: {
		mode: "edit",
		order: sampleOrder,
	},
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement.ownerDocument.body);

		expect(canvas.getByText("Edit order")).toBeInTheDocument();
		const nameField = canvas.getByLabelText("Name");
		expect(nameField).toHaveValue(sampleOrder.name);

		await userEvent.clear(nameField);
		await userEvent.type(nameField, "Acme — Widget batch #1 (updated)");
		expect(nameField).toHaveValue("Acme — Widget batch #1 (updated)");

		await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
		// Kumo's Dialog.Root also passes a second, event-details argument —
		// only the first (the open/closed boolean) is this test's concern.
		expect(args.onOpenChange).toHaveBeenCalledWith(false, expect.anything());
	},
};
