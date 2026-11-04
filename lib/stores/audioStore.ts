import { create } from 'zustand';

export type AudioMode = "arabic" | "translation" | "both";
export type TranslationAudioLang = "en" | "ur";
export type EnglishAudioVoice = "walk_studio" | "walk_classic";
export type AudioPhase = "arabic" | "translation" | null;

interface AudioState {
  currentSurah: number | null;
  currentAyah: number | null;
  currentWord: number | null;
  isPlaying: boolean;
  playbackRate: number;
  audioElement: HTMLAudioElement | null;
  audioMode: AudioMode;
  translationAudioLang: TranslationAudioLang;
  englishAudioVoice: EnglishAudioVoice;
  activePhase: AudioPhase;
  hasChosenAudioMode: boolean;
  
  // Actions
  playAyah: (surahNumber: number, ayahNumber: number, audioUrl: string) => void;
  pause: () => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  setCurrentSurah: (surah: number | null) => void;
  setCurrentAyah: (ayah: number | null) => void;
  setCurrentWord: (word: number | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setAudioMode: (mode: AudioMode) => void;
  setTranslationAudioLang: (lang: TranslationAudioLang) => void;
  setEnglishAudioVoice: (voice: EnglishAudioVoice) => void;
  setActivePhase: (phase: AudioPhase) => void;
  setHasChosenAudioMode: (chosen: boolean) => void;
  clearAudio: () => void;
}

const getInitialAudioMode = (): AudioMode => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("quran_audio_mode");
    if (saved === "arabic" || saved === "translation" || saved === "both") {
      return saved;
    }
  }
  return "both";
};

const getInitialTranslationLang = (): TranslationAudioLang => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("quran_translation_audio_lang");
    if (saved === "en" || saved === "ur") {
      return saved;
    }
  }
  return "en";
};

const getInitialEnglishVoice = (): EnglishAudioVoice => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("quran_english_audio_voice");
    if (saved === "walk_studio" || saved === "walk_classic") {
      return saved;
    }
  }
  return "walk_studio";
};

const getInitialHasChosen = (): boolean => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("quran_audio_mode_chosen") === "true";
  }
  return false;
};

export const useAudioStore = create<AudioState>((set, get) => ({
  currentSurah: null,
  currentAyah: null,
  currentWord: null,
  isPlaying: false,
  playbackRate: 1,
  audioElement: null,
  audioMode: getInitialAudioMode(),
  translationAudioLang: getInitialTranslationLang(),
  englishAudioVoice: getInitialEnglishVoice(),
  activePhase: null,
  hasChosenAudioMode: getInitialHasChosen(),

  playAyah: (surahNumber, ayahNumber, audioUrl) => {
    const state = get();
    
    // If playing the same ayah, just resume or pause
    if (state.currentAyah === ayahNumber && state.currentSurah === surahNumber) {
      if (state.audioElement) {
        if (state.isPlaying) {
          state.audioElement.pause();
          set({ isPlaying: false });
        } else {
          state.audioElement.playbackRate = state.playbackRate || 1;
          state.audioElement.play();
          set({ isPlaying: true });
        }
      }
      return;
    }

    // Stop current audio if playing a different ayah
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    const currentRate = state.playbackRate || 1;
    audio.defaultPlaybackRate = currentRate;
    audio.playbackRate = currentRate;
    
    audio.addEventListener('loadedmetadata', () => {
      audio.playbackRate = get().playbackRate || 1;
    });

    audio.addEventListener('ended', () => {
      set({ currentAyah: null, isPlaying: false, activePhase: null });
    });

    audio.addEventListener('pause', () => {
      set({ isPlaying: false });
    });

    audio.addEventListener('play', () => {
      audio.playbackRate = get().playbackRate || 1;
      set({ isPlaying: true });
    });

    audio.play();

    set({ 
      currentSurah: surahNumber, 
      currentAyah: ayahNumber, 
      isPlaying: true, 
      audioElement: audio 
    });
  },

  pause: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
    }
    set({ isPlaying: false });
  },

  setAudioElement: (element) => set({ audioElement: element }),
  setCurrentSurah: (surah) => set({ currentSurah: surah }),
  setCurrentAyah: (ayah) => set({ currentAyah: ayah }),
  setCurrentWord: (word) => set({ currentWord: word }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  setAudioMode: (mode: AudioMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quran_audio_mode", mode);
      localStorage.setItem("quran_audio_mode_chosen", "true");
    }
    set({ audioMode: mode, hasChosenAudioMode: true });
  },

  setTranslationAudioLang: (lang: TranslationAudioLang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quran_translation_audio_lang", lang);
    }
    set({ translationAudioLang: lang });
  },

  setEnglishAudioVoice: (voice: EnglishAudioVoice) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quran_english_audio_voice", voice);
    }
    set({ englishAudioVoice: voice });
  },

  setActivePhase: (phase: AudioPhase) => set({ activePhase: phase }),

  setHasChosenAudioMode: (chosen: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quran_audio_mode_chosen", chosen ? "true" : "false");
    }
    set({ hasChosenAudioMode: chosen });
  },

  setPlaybackRate: (rate: number) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.defaultPlaybackRate = rate;
      audioElement.playbackRate = rate;
    }
    // Also trigger custom event so other active audio players sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('playbackRateChange', { detail: { rate } }));
    }
    set({ playbackRate: rate });
  },

  clearAudio: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    set({ currentSurah: null, currentAyah: null, currentWord: null, isPlaying: false, audioElement: null, activePhase: null });
  }
}));
