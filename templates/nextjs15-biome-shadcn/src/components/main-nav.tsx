"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icons } from "@/components/icons";
import { navConfig } from "@/config/nav";
import { cn, toSlug } from "@/lib/utils";

export function MainNav() {
	const pathname = usePathname();

	const navigation = navConfig.main;

	return (
		<div className="mr-4 hidden md:flex">
			<Link href="/" className="mr-4 flex items-center gap-2 lg:mr-6">
				<Icons.logoImg variant="nav" />
			</Link>
			<nav className="flex items-center gap-4 text-sm xl:gap-6">
				{navigation.map(({ href, title }) => (
					<Link
						key={`nav-${toSlug(title)}`}
						href={href}
						className={cn(
							"transition-colors hover:text-foreground/80",
							pathname === href ? "text-foreground" : "text-foreground/80",
						)}
					>
						{title}
					</Link>
				))}
			</nav>
		</div>
	);
}
