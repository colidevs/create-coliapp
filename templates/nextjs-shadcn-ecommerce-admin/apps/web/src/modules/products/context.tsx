"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

/**
 * Admin-only query-key context, mirroring `modules/categories/context.tsx`'s
 * shape exactly — feeds `table.tsx`'s `DataTable`. The storefront's own
 * `products-list-client.tsx` (Phase 6) reads its query key straight from
 * `queries.ts`'s `queryOptions()` instead and never needed this.
 */
interface Context {
	queryKey: string;
}

const ProductsContext = createContext({} as Context);

function useProducts(): Context {
	return { queryKey: "admin-products" };
}

export function ProductsProviderClient({ children }: PropsWithChildren) {
	const state = useProducts();
	return (
		<ProductsContext.Provider value={state}>
			{children}
		</ProductsContext.Provider>
	);
}

export function useProductsContext() {
	return useContext(ProductsContext);
}
