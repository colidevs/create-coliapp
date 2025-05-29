import localFont from "next/font/local";

export const Poppins = localFont({
	variable: "--font-Poppins",
	src: [
		{
			path: "../../public/fonts/poppins/Poppins-Regular.ttf",
			weight: "400",
			style: "normal",
		},
		{
			path: "../../public/fonts/poppins/Poppins-Medium.ttf",
			weight: "500",
			style: "normal",
		},
		{
			path: "../../public/fonts/poppins/Poppins-Bold.ttf",
			weight: "700",
			style: "normal",
		},
		// italic
		{
			path: "../../public/fonts/poppins/italic/Poppins-Italic.ttf",
			weight: "400",
			style: "italic",
		},
		{
			path: "../../public/fonts/poppins/italic/Poppins-MediumItalic.ttf",
			weight: "500",
			style: "italic",
		},
		{
			path: "../../public/fonts/poppins/italic/Poppins-BoldItalic.ttf",
			weight: "700",
			style: "italic",
		},
	],
});

export const Montserrat = localFont({
	variable: "--font-Montserrat",
	src: [
		{
			path: "../../public/fonts/montserrat/Montserrat-Regular.ttf",
			weight: "400",
			style: "normal",
		},
		{
			path: "../../public/fonts/montserrat/Montserrat-Medium.ttf",
			weight: "500",
			style: "normal",
		},
		{
			path: "../../public/fonts/montserrat/Montserrat-Bold.ttf",
			weight: "700",
			style: "normal",
		},
		// italic
		{
			path: "../../public/fonts/montserrat/italic/Montserrat-Italic.ttf",
			weight: "400",
			style: "italic",
		},
		{
			path: "../../public/fonts/montserrat/italic/Montserrat-MediumItalic.ttf",
			weight: "500",
			style: "italic",
		},
		{
			path: "../../public/fonts/montserrat/italic/Montserrat-BoldItalic.ttf",
			weight: "700",
			style: "italic",
		},
	],
});
