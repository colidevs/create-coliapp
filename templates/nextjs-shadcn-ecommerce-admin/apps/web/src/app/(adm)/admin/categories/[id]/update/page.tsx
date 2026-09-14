import { notFound } from "next/navigation";
import { getCategoryByIdQuery } from "@/modules/categories/actions";
import { CategoryForm } from "@/modules/categories/form";

export default async function AdminCategoryUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const category = await getCategoryByIdQuery(id);

	if (!category) notFound();

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">Edit category</h1>
			<CategoryForm category={category} />
		</div>
	);
}
