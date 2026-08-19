"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

/**
 * One example ECharts component (console-ui-kumo.md /
 * frontend-performance-tooling.md's "Kumo/console track: ECharts"
 * convention — unchanged from Kumo's own `echarts@^6` peer dep). Kumo ships
 * no chart wrapper of its own, so this mounts the `echarts` package
 * directly: `echarts.init()` on a sized container, `setOption()`, and
 * `dispose()` on unmount.
 *
 * SSRs as an empty, correctly-sized container and draws only after
 * hydration — expected ECharts behavior, not a bug
 * (frontend-performance-tooling.md's own note). Its own `"use client"` leaf
 * per the RSC client-boundary rule: ECharts' imperative lifecycle needs a
 * real DOM node and browser APIs, regardless of whether the component itself
 * is a dot-notation compound surface.
 *
 * Demo data only, by design: `DEFAULT_DATA` mirrors the shape of the
 * two-tenant seed (`src/mocks/data/orders.ts`'s `defaultSeed()` — 3 orders
 * for tenant_acme, 2 for tenant_beta) as static numbers, deliberately not an
 * import of mock/demo infrastructure into production-shaped UI code. This
 * component's only job is demonstrating the correct mount/resize/dispose
 * pattern — wiring it to a real aggregate query is a follow-up, not this
 * phase's scope ("one example component", not a charting module).
 */
export interface OrdersByTenantChartProps {
	data?: { tenant: string; orders: number }[];
}

const DEFAULT_DATA: NonNullable<OrdersByTenantChartProps["data"]> = [
	{ tenant: "Acme Storefront", orders: 3 },
	{ tenant: "Beta Storefront", orders: 2 },
];

export function OrdersByTenantChart({
	data = DEFAULT_DATA,
}: OrdersByTenantChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		const chart = echarts.init(container);

		chart.setOption({
			tooltip: {},
			grid: { left: 48, right: 16, top: 16, bottom: 32 },
			xAxis: { type: "category", data: data.map((point) => point.tenant) },
			yAxis: { type: "value", minInterval: 1 },
			series: [
				{
					type: "bar",
					name: "Orders",
					data: data.map((point) => point.orders),
				},
			],
		});

		function handleResize() {
			chart.resize();
		}

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			chart.dispose();
		};
	}, [data]);

	return (
		<div
			ref={containerRef}
			role="img"
			aria-label="Orders by tenant, bar chart"
			className="h-64 w-full"
		/>
	);
}
