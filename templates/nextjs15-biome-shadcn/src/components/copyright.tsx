import { cn } from "@/lib/utils";
import type { PropsWithClassName } from "@/types";

interface Props extends PropsWithClassName {
	text: string;
}

export function Copyright({ text, className }: Props) {
	return (
		<span className={cn("text-muted-foreground", className)}>
			© {new Date().getFullYear()} {text}
		</span>
	);
}
