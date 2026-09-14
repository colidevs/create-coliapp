import { notFound } from "next/navigation";

import { getStockByIdQuery } from "@/modules/stock/actions";
import { StockForm } from "@/modules/stock/form";

export default async function AdminStockUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const stock = await getStockByIdQuery(id);

	if (!stock) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit stock</h1>
			<StockForm stock={stock} />
		</div>
	);
}
