"use client";

import {
	Boxes,
	ChevronLeft,
	ClipboardList,
	Image as ImageIcon,
	Package,
	Shapes,
	Tags,
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
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

/**
 * Built on shadcn's real `Sidebar`/`SidebarProvider`/`SidebarInset` primitive
 * system (`ui/sidebar.tsx`, ported from munod/www's working implementation)
 * instead of a hand-rolled flex layout. The prior hand-rolled `<aside
 * className="flex h-svh w-64 ...">` fixed the sidebar to exactly one
 * viewport height while the page content column could grow past it
 * (`min-h-svh`), which broke document-level scroll the moment any admin
 * page's content exceeded one viewport height. The primitive system's
 * `SidebarInset` + `overflow-auto` scroll containment (wired in
 * `layout.tsx`) fixes that structurally.
 *
 * Kept a flat `SidebarMenu` list (no collapsible "CMS" sub-group) — this
 * template's admin surface (6 entities) doesn't need munod's nested
 * grouping.
 *
 * PR8 adds one entry, "Option types" — not "Option values": design/tasks
 * (`sdd/ecommerce-product-variants`) add exactly one nav entry for the
 * option-vocabulary surface. Values are scoped by option type (mirroring
 * `admin/product-images`'s own `?productId=` filter) and are reached via a
 * "Manage values" row action on the option-types table
 * (`modules/variant-option-types/table.tsx`), never their own top-level nav
 * entry.
 */
const NAV_ITEMS = [
	{ title: "Products", url: "/admin/products", icon: Boxes },
	{ title: "Categories", url: "/admin/categories", icon: Shapes },
	{ title: "Product Images", url: "/admin/product-images", icon: ImageIcon },
	{ title: "Option types", url: "/admin/variant-option-types", icon: Tags },
	{ title: "Stock", url: "/admin/stock", icon: Package },
	{ title: "Orders", url: "/admin/orders", icon: ClipboardList },
] as const;

export function AppSidebar() {
	const { data: session } = authClient.useSession();
	const { theme, setTheme } = useTheme();
	const pathname = usePathname();

	if (!session) return null;

	return (
		<Sidebar>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem className="relative">
								<SidebarMenuButton
									asChild
									className="hover:bg-neutral-800 mb-2 bg-neutral-800 text-accent hover:text-accent"
								>
									<Link href="/" className="justify-center font-normal">
										<ChevronLeft className="size-4" />
										Store
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							{NAV_ITEMS.map((item) => {
								const isActive = pathname.startsWith(item.url);
								return (
									<SidebarMenuItem key={item.url}>
										<SidebarMenuButton asChild isActive={isActive}>
											<Link href={item.url}>
												<item.icon />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											{session.user.name}
										</span>
										<span className="truncate text-xs text-muted-foreground">
											{session.user.email}
										</span>
									</div>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								side="right"
								sideOffset={4}
								className="w-56"
							>
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
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
