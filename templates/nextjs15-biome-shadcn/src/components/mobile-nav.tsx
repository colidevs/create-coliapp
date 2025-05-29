"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { navConfig } from "@/config/nav";
import { cn, toSlug } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import { Icons } from "./icons";

export function MobileNav() {
	const [open, setOpen] = useState(false);

	const onOpenChange = useCallback((open: boolean) => {
		setOpen(open);
	}, []);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerTitle className="sr-only">menu</DrawerTitle>
			<DrawerTrigger asChild>
				<Button
					variant="ghost"
					className="h-8 w-full gap-4 px-0 justify-between hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
				>
					<Icons.logoImg variant="nav" className="w-fit" />
					<MenuIcon className="size-6" />
				</Button>
			</DrawerTrigger>
			<DrawerContent className="max-h-[80dvh] p-0">
				<div className="overflow-auto p-6">
					<div className="flex flex-col space-y-3">
						{navConfig.main?.map(
							(item) =>
								item.href && (
									<MobileLink
										key={item.href}
										href={item.href}
										onOpenChange={setOpen}
										className="text-lg"
									>
										{item.title}
									</MobileLink>
								),
						)}
					</div>
					<div className="flex flex-col space-y-2">
						{navConfig.side.map((item) => (
							<div
								key={`nav-mobile-${toSlug(item.title)}`}
								className="flex flex-col gap-4 pt-6"
							>
								<h4 className="text-lg">{item.title}</h4>
								{item?.items?.length &&
									item.items.map((item) => (
										<Fragment key={item.href}>
											{!item.disabled &&
												(item.href ? (
													<MobileLink
														href={item.href}
														onOpenChange={setOpen}
														className="ms-4"
													>
														{item.title}
														{item.label && (
															<span className="ml-2 rounded-md bg-foreground px-1.5 py-0.5 text-xs leading-none text-background no-underline group-hover:no-underline">
																{item.label}
															</span>
														)}
													</MobileLink>
												) : (
													item.title
												))}
										</Fragment>
									))}
							</div>
						))}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

interface MobileLinkProps extends LinkProps {
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
	className?: string;
}

function MobileLink({
	href,
	onOpenChange,
	className,
	children,
	...props
}: MobileLinkProps) {
	const router = useRouter();
	return (
		<Link
			href={href}
			onClick={() => {
				router.push(href.toString());
				onOpenChange?.(false);
			}}
			className={cn("", className)}
			{...props}
		>
			{children}
		</Link>
	);
}
