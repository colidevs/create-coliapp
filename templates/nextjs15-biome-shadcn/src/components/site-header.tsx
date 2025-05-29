import { Icons } from "@/components/icons";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { ModeSwitcher } from "./theme/mode-switcher";
import { Button } from "./ui/button";

interface Props {
	useBorder: boolean;
}

export function SiteHeader({ useBorder = false }: Props) {
	return (
		<header
			className={cn(
				"sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/5",
				useBorder ? "border-grid" : "border-muted/20",
			)}
		>
			<div className="container-wrapper">
				<div className="container flex h-14 items-center gap-2 md:gap-4">
					<MainNav />
					<MobileNav />
					<div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
						<div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none" />
						<nav className="flex items-center gap-0.5">
							<Button
								asChild
								variant="ghost"
								size="icon"
								className="h-8 w-8 px-0"
							>
								<Link
									href={siteConfig.links.instagram}
									target="_blank"
									rel="noreferrer"
								>
									<Icons.instagram className="h-4 w-4" />
									<span className="sr-only">Instagram</span>
								</Link>
							</Button>
							<ModeSwitcher />
						</nav>
					</div>
				</div>
			</div>
		</header>
	);
}
