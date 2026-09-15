"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const VariantOptionValuesContext = createContext({} as Context);

function useVariantOptionValues(): Context {
	return { queryKey: "variant-option-values" };
}

export function VariantOptionValuesProviderClient({
	children,
}: PropsWithChildren) {
	const state = useVariantOptionValues();
	return (
		<VariantOptionValuesContext.Provider value={state}>
			{children}
		</VariantOptionValuesContext.Provider>
	);
}

export function useVariantOptionValuesContext() {
	return useContext(VariantOptionValuesContext);
}
