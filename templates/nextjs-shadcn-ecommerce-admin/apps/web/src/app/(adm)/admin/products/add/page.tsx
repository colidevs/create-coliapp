import { listCategoriesQuery } from "@/modules/categories/actions";
import { ProductForm } from "@/modules/products/form";

export default async function AdminProductAddPage() {
	const categories = await listCategoriesQuery();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New product</h1>
			<ProductForm categories={categories} />
		</div>
	);
}
