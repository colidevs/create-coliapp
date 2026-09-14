"use client";

import {
	Boxes,
	ChevronLeft,
	ClipboardList,
	Image as ImageIcon,
	Package,
	Shapes,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { LogoutButton } from "@/components/logout-button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * ADAPTED, not a literal port of `munod/www/src/app/(adm)/admin/
 * app-sidebar.tsx` — that file builds on shadcn's full `Sidebar`/
 * `SidebarProvider`/`SidebarInset` primitive system (`ui/sidebar.tsx`, a
 * ~700-line component this template does not ship), plus a collapsible
 * "CMS" sub-group (`nav-items.ts`) sized for munod's own ~10-entity admin.
 * This template's admin surface has 5 entities (Products, Categories,
 * Product Images, Stock, Orders — PR7b adds the last two); a plain flex nav
 * list covers that without importing the full Sidebar primitive. Same
 * adaptation posture as the storefront port's own `header.tsx`/`shell.tsx`
 * (task 6.1/6.5) — simplified to what this template's actual scope needs.
 */
const NAV_ITEMS = [
	{ title: "Products", url: "/admin/products", icon: Boxes },
	{ title: "Categories", url: "/admin/categories", icon: Shapes },
	{ title: "Product Images", url: "/admin/product-images", icon: ImageIcon },
	{ title: "Stock", url: "/admin/stock", icon: Package },
	{ title: "Orders", url: "/admin/orders", icon: ClipboardList },
] as const;

export function AppSidebar() {
	const { data: session } = authClient.useSession();
	const { theme, setTheme } = useTheme();
	const pathname = usePathname();

	if (!session) return null;

	return (
		<aside className="flex h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
			<div className="p-2">
				<Link
					href="/"
					className="flex items-center justify-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm text-accent hover:bg-neutral-700"
				>
					<ChevronLeft className="size-4" />
					Store
				</Link>
			</div>
			<nav className="flex-1 space-y-1 px-2">
				{NAV_ITEMS.map((item) => {
					const isActive = pathname.startsWith(item.url);
					return (
						<Link
							key={item.url}
							href={item.url}
							className={cn(
								"flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
							)}
						>
							<item.icon className="size-4" />
							{item.title}
						</Link>
					);
				})}
			</nav>
			<div className="border-t p-2">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent">
						<div className="grid flex-1 leading-tight">
							<span className="truncate font-medium">{session.user.name}</span>
							<span className="truncate text-xs text-muted-foreground">
								{session.user.email}
							</span>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuLabel>Theme</DropdownMenuLabel>
						<DropdownMenuItem onSelect={() => setTheme("light")}>
							Light{theme === "light" ? " ✓" : ""}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setTheme("dark")}>
							Dark{theme === "dark" ? " ✓" : ""}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setTheme("system")}>
							System{theme === "system" ? " ✓" : ""}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<LogoutButton />
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</aside>
	);
}
