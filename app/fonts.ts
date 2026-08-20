import { Noto_Nastaliq_Urdu } from "next/font/google";

export const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-nastaliq-urdu",
  display: "swap",
});

export const amiri = {
  className: "font-serif",
};

export const amiriquran = {
  className: "font-serif",
};

export const inter = {
  className: "font-sans",
  variable: "--font-inter",
};

export const fraunces = {
  className: "font-serif",
  variable: "--font-fraunces",
};
