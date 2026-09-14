import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		viewTransition: true,
	},
	images: {
		unoptimized: true,
		remotePatterns: [{ protocol: "https", hostname: "images.colidevs.com" }],
	},
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
};

export default nextConfig;
