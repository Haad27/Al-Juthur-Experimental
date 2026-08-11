import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function copyToClipboard(text: string, successMessage = "Copied to clipboard!") {
  if (!text) return;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return;
    }
  } catch (err) {
    // Fallback to textarea
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    textArea.remove();
    if (successful) {
      toast.success(successMessage);
    } else {
      toast.error("Failed to copy text.");
    }
  } catch (e) {
    toast.error("Failed to copy text.");
  }
}

export function convertNumberToArabicNumeral(number: number) {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return number
    .toString()
    .split("")
    .map((digit) => arabicNumerals[parseInt(digit)])
    .join("");
}

export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export function stripBismillahPrefix(text: string, surahNumber: number, ayahNumber: number): string {
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) return text;
  const stripHarakat = (str: string) =>
    str.replace(/[\u064B-\u065F\u0670\uFEFF]/g, "").replace(/\u0671/g, "\u0627");
  const words = text.trim().split(/\s+/);
  if (words.length >= 4) {
    const first4Normalized = stripHarakat(words.slice(0, 4).join(" "));
    if (first4Normalized === "بسم الله الرحمن الرحيم") {
      return words.slice(4).join(" ");
    }
  }
  return text;
}

export function normalizeArabic(text: string) {
  return text
    .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "") // remove tashkeel
    .replace(/[\u200F\u200E\u06DD]/g, "") // remove markers
    .replace(/\s+/g, "") // remove whitespace
    .trim();
}

export const unlockAudio = () => {
  document
    .getElementById("ayah-1")
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};
