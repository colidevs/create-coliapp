import { VariantOptionTypeForm } from "@/modules/variant-option-types/form";

export default function AdminVariantOptionTypeAddPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold">New option type</h1>
			<VariantOptionTypeForm />
		</div>
	);
}
