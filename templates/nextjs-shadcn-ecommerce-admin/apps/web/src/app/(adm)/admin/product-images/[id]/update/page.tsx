import { notFound } from "next/navigation";

import { getProductImageByIdQuery } from "@/modules/product-images/actions";
import { ProductImageForm } from "@/modules/product-images/form";

export default async function AdminProductImageUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const image = await getProductImageByIdQuery(id);

	if (!image) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit product image</h1>
			<ProductImageForm image={image} />
		</div>
	);
}
