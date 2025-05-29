import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Copyright } from "./copyright";
import { Icons } from "./icons";

interface Props {
	useBorder: boolean;
}

export function SiteFooter({ useBorder = false }: Props) {
	return (
		<>
			<footer
				className={cn(
					"border-t md:py-0 z-50",
					useBorder ? "border-grid" : "border-muted/20",
				)}
			>
				<div className="container-wrapper">
					<div className="container py-4">
						<div className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-end">
							<Copyright text={siteConfig.name} />
							{" | "}
							powered by{" "}
							<a
								href={siteConfig.links.instagram}
								target="_blank"
								rel="noreferrer"
								className=""
							>
								<em className="text-foreground/80 relative ms-[14px]">
									<Icons.logo className="size-4 rotate-[-8deg] absolute inline bottom-1 -left-[10px]" />
									colidevs
								</em>
								.
							</a>
						</div>
					</div>
				</div>
			</footer>
		</>
	);
}
