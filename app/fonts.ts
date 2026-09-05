import {
  Noto_Nastaliq_Urdu,
  Gulzar,
  Noto_Sans_Arabic,
  Inter,
  Lora,
  Playfair_Display,
  Cinzel,
  Plus_Jakarta_Sans,
} from "next/font/google";

export const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-nastaliq-urdu",
  display: "swap",
});

export const gulzar = Gulzar({
  weight: "400",
  subsets: ["arabic"],
  variable: "--font-gulzar",
  display: "swap",
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-arabic",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const amiri = {
  className: "font-serif",
};

export const amiriquran = {
  className: "font-serif",
};

export const fraunces = {
  className: "font-serif",
  variable: "--font-fraunces",
};
