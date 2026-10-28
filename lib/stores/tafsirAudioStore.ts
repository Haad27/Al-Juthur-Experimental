/**
 * lib/stores/tafsirAudioStore.ts
 *
 * Global Zustand store that tracks:
 *  - Which ayah card is currently playing (one at a time)
 *  - Per-language voice preferences (persisted to localStorage)
 *  - Global playback rate (persisted)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TtsLang = "ar" | "ur" | "en";

interface TafsirAudioState {
  /** Key of the currently-playing ayah: "{surahId}:{ayahNum}:{authorId}" or null */
  playingKey: string | null;
  setPlayingKey: (key: string | null) => void;

  /** Global playback speed multiplier */
  globalRate: number;
  setGlobalRate: (r: number) => void;

  /** Preferred voice name per language — stored so user choice survives navigation */
  voicePrefs: Partial<Record<TtsLang, string>>;
  setVoicePref: (lang: TtsLang, voiceName: string) => void;
}

export const useTafsirAudioStore = create<TafsirAudioState>()(
  persist(
    (set) => ({
      playingKey: null,
      setPlayingKey: (key) => set({ playingKey: key }),

      globalRate: 1,
      setGlobalRate: (r) => set({ globalRate: r }),

      voicePrefs: {},
      setVoicePref: (lang, voiceName) =>
        set((state) => ({
          voicePrefs: { ...state.voicePrefs, [lang]: voiceName },
        })),
    }),
    {
      name: "aljuthur-tafsir-audio",
      // Only persist user preferences, not transient play state
      partialize: (state) => ({
        globalRate: state.globalRate,
        voicePrefs: state.voicePrefs,
      }),
    }
  )
);
