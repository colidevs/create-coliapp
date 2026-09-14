import { ProductImageForm } from "@/modules/product-images/form";

export default async function AdminProductImageAddPage({
	searchParams,
}: {
	searchParams: Promise<{ productId?: string }>;
}) {
	const { productId } = await searchParams;

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New product image</h1>
			<ProductImageForm defaultProductId={productId} />
		</div>
	);
}
