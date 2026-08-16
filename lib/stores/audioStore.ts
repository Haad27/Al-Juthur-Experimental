import { create } from 'zustand';

interface AudioState {
  currentSurah: number | null;
  currentAyah: number | null;
  currentWord: number | null;
  isPlaying: boolean;
  playbackRate: number;
  audioElement: HTMLAudioElement | null;
  
  // Actions
  playAyah: (surahNumber: number, ayahNumber: number, audioUrl: string) => void;
  pause: () => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  setCurrentSurah: (surah: number | null) => void;
  setCurrentAyah: (ayah: number | null) => void;
  setCurrentWord: (word: number | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  clearAudio: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentSurah: null,
  currentAyah: null,
  currentWord: null,
  isPlaying: false,
  playbackRate: 1,
  audioElement: null,

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
    audio.playbackRate = state.playbackRate || 1;
    
    audio.addEventListener('ended', () => {
      set({ currentAyah: null, isPlaying: false });
    });

    audio.addEventListener('pause', () => {
      set({ isPlaying: false });
    });

    audio.addEventListener('play', () => {
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
  },

  setAudioElement: (element) => set({ audioElement: element }),
  setCurrentSurah: (surah) => set({ currentSurah: surah }),
  setCurrentAyah: (ayah) => set({ currentAyah: ayah }),
  setCurrentWord: (word) => set({ currentWord: word }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  setPlaybackRate: (rate: number) => {
    const { audioElement } = get();
    if (audioElement) {
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
    set({ currentSurah: null, currentAyah: null, currentWord: null, isPlaying: false, audioElement: null });
  }
}));
