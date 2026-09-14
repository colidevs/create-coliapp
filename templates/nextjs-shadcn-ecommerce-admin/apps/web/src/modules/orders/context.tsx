"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const OrdersContext = createContext({} as Context);

function useOrders(): Context {
	return { queryKey: "admin-orders" };
}

export function OrdersProviderClient({ children }: PropsWithChildren) {
	const state = useOrders();
	return (
		<OrdersContext.Provider value={state}>{children}</OrdersContext.Provider>
	);
}

export function useOrdersContext() {
	return useContext(OrdersContext);
}
