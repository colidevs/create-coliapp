"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Ported verbatim (structurally) from `munod/www/src/components/
 * return-link.tsx` — fully generic, no munod-domain content.
 */
export function ReturnLink() {
	const router = useRouter();

	return (
		<Button
			variant="link"
			onClick={() => router.back()}
			className={cn(
				"mx-8 my-2 w-fit items-center gap-2 text-sm font-normal text-muted-foreground hover:cursor-pointer hover:text-foreground",
			)}
		>
			<ChevronLeft className="size-4 stroke-1" />
			Back
		</Button>
	);
}
