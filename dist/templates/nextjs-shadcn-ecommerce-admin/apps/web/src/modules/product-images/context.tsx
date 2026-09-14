"use client";

import { createContext, type PropsWithChildren, useContext } from "react";

interface Context {
	queryKey: string;
}

const ProductImagesContext = createContext({} as Context);

function useProductImages(): Context {
	return { queryKey: "product-images" };
}

export function ProductImagesProviderClient({ children }: PropsWithChildren) {
	const state = useProductImages();
	return (
		<ProductImagesContext.Provider value={state}>
			{children}
		</ProductImagesContext.Provider>
	);
}

export function useProductImagesContext() {
	return useContext(ProductImagesContext);
}
