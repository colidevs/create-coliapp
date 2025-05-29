import type { PropsWithClassName } from "@/types";
import type { PropsWithChildren } from "react";

interface Props extends PropsWithChildren, PropsWithClassName {}

export function Container({ children, className }: Props) {
	return <div className="flex flex-1 flex-col">{children}</div>;
}
