"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const CategoriesContext = createContext({} as Context);

function useCategories(): Context {
	return { queryKey: "categories" };
}

export function CategoriesProviderClient({ children }: PropsWithChildren) {
	const state = useCategories();
	return (
		<CategoriesContext.Provider value={state}>
			{children}
		</CategoriesContext.Provider>
	);
}

export function useCategoriesContext() {
	return useContext(CategoriesContext);
}
