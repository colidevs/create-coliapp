"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getProductByIdQuery, paginationQuery } from "./actions";

/**
 * Known limitation (deliberately not solved here, see
 * `.claude/rules/api-caching-resilience.md`-adjacent "don't over-engineer"
 * guidance): this fetches up to `PRODUCT_FETCH_LIMIT` products in one
 * request and filters client-side as the admin types — there is no
 * server-side search/debounce wiring. `ListProductsParams.q` already exists
 * on the API and is the natural escalation path if a real catalog ever
 * exceeds this limit, but that's a separate, not-yet-needed change.
 */
const PRODUCT_FETCH_LIMIT = 200;

/**
 * Replaces a raw-UUID `productId` text input with a searchable
 * name-based picker (client feedback: "creating a product image makes the
 * admin manually type a raw product UUID into a plain text box"). Built
 * from shadcn's own documented Combobox recipe (`Popover` + `Command`) —
 * neither `munod` nor `org-jaulasvacias` has a real product-image create
 * form to port a pattern from (munod's image management is read-only and
 * per-*variant*, not per-product; org-jaulasvacias has no product-images
 * module at all), so this is a fresh build on the existing shadcn/ui set,
 * not a ported pattern.
 *
 * `value`/`onChange` mirror `@tanstack/react-form`'s field contract
 * (`field.state.value`/`field.handleChange`) so this drops directly into a
 * `form.Field` render prop, same as the plain `<Input>` it replaces.
 *
 * When `disabled` (editing an existing image, where `productId` is fixed),
 * this renders as a non-interactive control showing the resolved product
 * name — resolved via a direct by-id lookup (`getProductByIdQuery`), not
 * from the capped list above, so the correct name still shows even if the
 * product isn't among the first `PRODUCT_FETCH_LIMIT` results. The full
 * list is not fetched at all in this case (`enabled: !disabled`) since
 * picking is impossible anyway.
 */
export function ProductCombobox({
	value,
	onChange,
	onBlur,
	disabled,
	id,
	"aria-invalid": ariaInvalid,
}: {
	value: string;
	onChange: (productId: string) => void;
	onBlur?: () => void;
	disabled?: boolean;
	id?: string;
	"aria-invalid"?: boolean;
}) {
	const [open, setOpen] = useState(false);

	const listQuery = useQuery({
		queryKey: ["products", "combobox", PRODUCT_FETCH_LIMIT],
		queryFn: async () => {
			const { rows } = await paginationQuery(
				{ pageIndex: 0, pageSize: PRODUCT_FETCH_LIMIT },
				{},
			);
			return rows;
		},
		staleTime: 60_000,
		enabled: !disabled,
	});

	const selectedProductQuery = useQuery({
		queryKey: ["product", value],
		queryFn: () => getProductByIdQuery(value),
		staleTime: 60_000,
		enabled: Boolean(disabled) && value.length > 0,
	});

	const products = listQuery.data ?? [];
	const selectedFromList = products.find((product) => product.id === value);

	const label = disabled
		? (selectedProductQuery.data?.name ??
			(selectedProductQuery.isLoading ? "Loading…" : value))
		: (selectedFromList?.name ??
			(value ? value : listQuery.isLoading ? "Loading products…" : undefined));

	return (
		<Popover open={open && !disabled} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-invalid={ariaInvalid}
					disabled={disabled}
					onBlur={onBlur}
					className="w-full justify-between font-normal"
				>
					<span className={cn("truncate", !label && "text-muted-foreground")}>
						{label ?? "Select a product…"}
					</span>
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-(--radix-popover-trigger-width) p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search products by name…" />
					<CommandList>
						<CommandEmpty>
							{listQuery.isLoading ? "Loading…" : "No product found."}
						</CommandEmpty>
						<CommandGroup>
							{products.map((product) => (
								<CommandItem
									key={product.id}
									value={product.name}
									onSelect={() => {
										onChange(product.id);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 size-4",
											product.id === value ? "opacity-100" : "opacity-0",
										)}
									/>
									{product.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
