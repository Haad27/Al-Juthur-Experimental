import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\u06DE\u06DD\u058E\u25CB\u25CF\u25CE\u29BF\u29BE\u2735\u2736\u2742\u2740\u273F\u2741\u2055\u2737\u2738\u2739\u273A\u25C8\u25C9\u2743\u273D\u2734]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function copyToClipboard(text: string, successMessage = "Copied to clipboard!") {
  if (!text) return;
  const cleanText = stripHtml(text);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(cleanText);
      toast.success(successMessage);
      return;
    }
  } catch (err) {
    // Fallback to textarea
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = cleanText;
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

export function cleanQuranText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u06ED/g, "") // Remove Tanzil sequential tanween marker (U+06ED Small Low Meem) which mistakenly renders as a literal meem
    .replace(/\u064E\u0670/g, "\u0670") // Normalize redundant fatha + dagger alif
    .replace(/\u0670\u064E/g, "\u0670");
}

export function stripBismillahPrefix(text: string, surahNumber: number, ayahNumber: number): string {
  const cleaned = cleanQuranText(text);
  if (ayahNumber !== 1 || surahNumber === 1 || surahNumber === 9) return cleaned;
  const stripHarakat = (str: string) =>
    str.replace(/[\u064B-\u065F\u0670\uFEFF]/g, "").replace(/\u0671/g, "\u0627");
  const words = cleaned.trim().split(/\s+/);
  if (words.length >= 4) {
    const first4Normalized = stripHarakat(words.slice(0, 4).join(" "));
    if (first4Normalized === "بسم الله الرحمن الرحيم") {
      return words.slice(4).join(" ");
    }
  }
  return cleaned;
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

export function fragmentArabicText(text: string): { text: string; delimiter: string }[] {
  // Split on newline, period, question mark, exclamation mark, semicolon
  const rawSplit = text.split(/([\n.؟!؛]+)/);
  const fragments: { text: string; delimiter: string }[] = [];
  let currentText = '';
  
  for (let i = 0; i < rawSplit.length; i += 2) {
    const chunk = rawSplit[i];
    const delim = rawSplit[i + 1] || '';
    
    currentText += chunk;
    
    // Granularity floor: ~30 characters to avoid confetti fragments
    if (currentText.trim().length >= 30 || i + 2 >= rawSplit.length) {
      if (currentText.trim().length > 0 || delim.length > 0) {
        fragments.push({ text: currentText, delimiter: delim });
      }
      currentText = '';
    } else {
      currentText += delim;
    }
  }
  
  // Clean up any trailing fragments
  if (currentText.length > 0) {
    if (fragments.length > 0) {
      fragments[fragments.length - 1].delimiter += currentText;
    } else {
      fragments.push({ text: currentText, delimiter: '' });
    }
  }
  
  return fragments;
}
