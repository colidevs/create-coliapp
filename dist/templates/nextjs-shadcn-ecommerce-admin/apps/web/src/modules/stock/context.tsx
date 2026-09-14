"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const StockContext = createContext({} as Context);

function useStock(): Context {
	return { queryKey: "admin-stock" };
}

export function StockProviderClient({ children }: PropsWithChildren) {
	const state = useStock();
	return (
		<StockContext.Provider value={state}>{children}</StockContext.Provider>
	);
}

export function useStockContext() {
	return useContext(StockContext);
}
