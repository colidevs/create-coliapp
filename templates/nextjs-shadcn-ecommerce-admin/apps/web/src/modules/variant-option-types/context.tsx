"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const VariantOptionTypesContext = createContext({} as Context);

function useVariantOptionTypes(): Context {
	return { queryKey: "variant-option-types" };
}

export function VariantOptionTypesProviderClient({
	children,
}: PropsWithChildren) {
	const state = useVariantOptionTypes();
	return (
		<VariantOptionTypesContext.Provider value={state}>
			{children}
		</VariantOptionTypesContext.Provider>
	);
}

export function useVariantOptionTypesContext() {
	return useContext(VariantOptionTypesContext);
}
