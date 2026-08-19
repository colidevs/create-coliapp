export default function HomePage() {
	return (
		<main className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 p-8">
			<h1 className="text-2xl font-semibold">{"{{name}}"}</h1>
			<p className="text-kumo-secondary">
				colidevs console skeleton, scaffolded from `nextjs-kumo-console`.
			</p>
		</main>
	);
}
