import type { PropsWithChildren } from "react";

export function ColiHorizon() {
	return (
		<div className="absolute -z-50 w-full h-14 bg-gradient-to-b from-yellow-200 via-red-500/65 to-blue-500/65 opacity-60 blur-md" />
	);
}

export function ColiHorizonContainer({ children }: PropsWithChildren) {
	return (
		<div className="relative">
			<ColiHorizon />
			{children}
		</div>
	);
}
