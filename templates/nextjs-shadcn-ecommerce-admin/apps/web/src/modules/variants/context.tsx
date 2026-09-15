"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const VariantsContext = createContext({} as Context);

function useVariants(): Context {
	return { queryKey: "variants" };
}

export function VariantsProviderClient({ children }: PropsWithChildren) {
	const state = useVariants();
	return (
		<VariantsContext.Provider value={state}>
			{children}
		</VariantsContext.Provider>
	);
}

export function useVariantsContext() {
	return useContext(VariantsContext);
}
