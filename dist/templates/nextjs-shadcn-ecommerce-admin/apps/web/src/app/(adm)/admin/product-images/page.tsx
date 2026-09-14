import { ProductImagesPage } from "@/modules/product-images/page";

export default async function AdminProductImagesPage({
	searchParams,
}: {
	searchParams: Promise<{ productId?: string }>;
}) {
	const { productId } = await searchParams;

	return <ProductImagesPage filters={productId ? { productId } : undefined} />;
}
