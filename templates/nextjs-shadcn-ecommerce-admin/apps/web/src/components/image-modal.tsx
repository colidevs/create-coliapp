import { X } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PropsWithClassName } from "@/types";

/**
 * Ported from munod (`munod/www/src/components/image-modal.tsx`) — used by
 * `data-table.tsx`'s `ImageCell`. Kept byte-faithful; `isHomeImage` stays a
 * generic, product-agnostic prop name (a table-cell concern, not tied to
 * any one entity).
 */
export function ImageModal({
	className,
	url,
	isHomeImage = false,
}: PropsWithClassName & { url: string; isHomeImage?: boolean }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<div className={cn("relative h-[500px] w-full", className)}>
					{isHomeImage ? (
						<Badge className="absolute top-4.5 bg-blue-200 text-blue-900 right-2 z-10">
							Home
						</Badge>
					) : null}
					<Image
						src={url}
						alt={`Imagen - ${url}`}
						fill
						sizes="(max-width: 768px) 100vw, 500px"
						aria-label="ampliar"
						className="hover:cursor-pointer object-contain rounded"
						placeholder="blur"
						blurDataURL={url}
					/>
				</div>
			</DialogTrigger>
			<DialogContent className="p-0 m-0 w-[90vw] max-w-3xl bg-transparent border-0">
				<DialogTitle className="hidden" />
				<DialogClose asChild>
					<Button
						variant="ghost"
						className="absolute right-2 top-2 z-10 backdrop-blur rounded-full bg-white/80"
					>
						<X className="size-4" />
					</Button>
				</DialogClose>
				<div className="relative w-full h-[85vh]">
					<Image
						src={url}
						alt={`Imagen - ${url}`}
						fill
						sizes="(max-width: 768px) 100vw, 500px"
						className="rounded-lg object-contain"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
