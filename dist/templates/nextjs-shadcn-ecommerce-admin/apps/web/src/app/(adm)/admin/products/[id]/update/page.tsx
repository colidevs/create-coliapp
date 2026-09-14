import { notFound } from "next/navigation";

import { listCategoriesQuery } from "@/modules/categories/actions";
import { getProductByIdQuery } from "@/modules/products/actions";
import { ProductForm } from "@/modules/products/form";

export default async function AdminProductUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [product, categories] = await Promise.all([
		getProductByIdQuery(id),
		listCategoriesQuery(),
	]);

	if (!product) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit product</h1>
			<ProductForm product={product} categories={categories} />
		</div>
	);
}
