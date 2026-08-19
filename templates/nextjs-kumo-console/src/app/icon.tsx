import { ImageResponse } from "next/og";

// Code-generated favicon — deliberately NOT a static .svg/.png. This
// sidesteps create-coliapp's `replaceName()` pass, which reads/writes every
// scaffolded file as UTF-8 unconditionally and corrupts binary files (fixed
// in PR #18, not yet merged at the time this template was authored). A
// `.tsx` component emits no binary bytes into the template itself, so it is
// unaffected either way. Minimal placeholder — projects scaffolded from this
// template are expected to replace it with their own mark.
export const size = {
	width: 32,
	height: 32,
};

export const contentType = "image/png";

export default function Icon() {
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
				fontSize: 20,
				fontWeight: 700,
				borderRadius: "20%",
			}}
		>
			C
		</div>,
		{ ...size },
	);
}
