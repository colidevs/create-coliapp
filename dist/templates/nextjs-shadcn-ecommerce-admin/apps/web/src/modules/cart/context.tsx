"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

import { useCartStore } from "./store";

/**
 * Ported near-verbatim from munod's real `context/cart-sidebar-context.tsx`
 * — a plain open/close boolean context for the cart drawer, genuinely
 * generic (not furniture-specific), unlike the rest of that file's sibling
 * shell (`app-sidebar.tsx`'s mega-menu, `zoom-context.tsx`) which this
 * template's storefront deliberately does not port (see `shell.tsx`'s own
 * doc comment).
 */
interface CartDrawerContextType {
	open: boolean;
	setOpen: (open: boolean) => void;
	close: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextType | undefined>(
	undefined,
);

export function CartDrawerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		useCartStore.persist.rehydrate();
	}, []);

	return (
		<CartDrawerContext.Provider value={{ open, setOpen, close }}>
			{children}
		</CartDrawerContext.Provider>
	);
}

export function useCartDrawer(): CartDrawerContextType {
	const context = useContext(CartDrawerContext);
	if (!context) {
		throw new Error("useCartDrawer must be used within CartDrawerProvider");
	}
	return context;
}
