import { Poppins } from "next/font/google";
import { Montserrat } from "next/font/google";

export const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
});

export const montserrat = Montserrat({
	variable: "--font-montserrat",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
});
