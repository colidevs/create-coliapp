import { VariantsPage } from "@/modules/variants/page";

export default async function AdminProductVariantsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return <VariantsPage productId={id} />;
}
