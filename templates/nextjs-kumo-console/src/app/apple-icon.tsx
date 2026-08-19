import { ImageResponse } from "next/og";

// Code-generated Apple touch icon — see `icon.tsx` for why this template
// ships no static binary image assets.
export const size = {
	width: 180,
	height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#0b0d0f",
				color: "#f4f4f5",
				fontSize: 96,
				fontWeight: 700,
				borderRadius: "20%",
			}}
		>
			C
		</div>,
		{ ...size },
	);
}
