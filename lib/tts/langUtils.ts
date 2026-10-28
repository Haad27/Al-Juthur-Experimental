/**
 * lib/tts/langUtils.ts
 * Language detection helpers for Tafsir TTS engine.
 */

export type TtsLang = "ar" | "ur" | "en";

/**
 * Derive a TTS language code from a language name string (e.g. "Urdu" → "ur").
 * Defaults to "en" for any unrecognised language.
 */
export function getLangCode(langName: string): TtsLang {
  const l = (langName || "").toLowerCase();
  if (l.includes("arabic") || l === "العربية") return "ar";
  if (l.includes("urdu")) return "ur";
  return "en";
}

/** Returns the BCP-47 language tag prefix used to match browser voices */
export const LANG_BCP47: Record<TtsLang, string> = {
  ar: "ar",
  ur: "ur",
  en: "en",
};

/** Human-readable label shown in the voice picker */
export const LANG_LABEL: Record<TtsLang, string> = {
  ar: "Arabic",
  ur: "Urdu",
  en: "English",
};
