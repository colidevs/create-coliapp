import { CategoryForm } from "@/modules/categories/form";

export default function AdminCategoryAddPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New category</h1>
			<CategoryForm />
		</div>
	);
}
