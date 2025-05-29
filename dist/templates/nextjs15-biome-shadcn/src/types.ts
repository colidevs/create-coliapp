import type { Icons } from "@/components/icons";

interface NavItem {
	title: string;
	href?: string;
	disabled?: boolean;
	external?: boolean;
	icon?: keyof typeof Icons;
	label?: string;
}

interface NavItemWithChildren extends NavItem {
	items: NavItemWithChildren[];
}

export interface MainNavItem extends Omit<NavItem, "href"> {
	href: string;
}

export interface SidebarNavItem extends NavItemWithChildren {}

export interface PropsWithClassName {
	className?: string;
}
