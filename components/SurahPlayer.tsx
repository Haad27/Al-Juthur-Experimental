"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pause,
  SkipForwardIcon,
  SkipBackIcon,
  ChevronDown,
  Play,
  Mic,
  BookOpen,
  Languages,
  Sparkles,
  SlidersHorizontal,
  X,
  Volume2
} from "lucide-react";

import levenshtein from "js-levenshtein";
import { toast } from "sonner";

import GettingStartedPopup from "./popups/GettingStartedPopup";
import { formatTime, normalizeArabic, unlockAudio, cn } from "@/lib/utils";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { fetchAyahAudio } from "@/api/api";
import { useAudioStore, AudioMode, TranslationAudioLang } from "@/lib/stores/audioStore";
import { getGlobalAyahNumber } from "@/lib/surahsData";
import useScrollDirection from "@/hooks/useScrollDirection";

interface SurahPlayerProps {
  surahNumber: number;
  ayahText: string[];
  lastAyahNumber: number;
  router: any;
  aiChatContext?: any;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function SurahPlayer({
  surahNumber,
  ayahText,
  lastAyahNumber,
  router,
  aiChatContext,
}: SurahPlayerProps) {
  const { mistakeDetection, selectedReciter, setSelectedReciter, isWordDialogVisible } = useGlobalState();
  const audioStore = useAudioStore();

  const [reciters, setReciters] = useState<any[]>([]);

  useEffect(() => {
    import("@/api/api").then((module) => {
      module.fetchReciters().then((res) => {
        if (res?.recitations) {
          setReciters(res.recitations);
        }
      });
    });
  }, []);

  // Audio effects for pronunciation checking
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const wrongRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctRef.current = new Audio("/assets/sounds/correct.mp3");
    wrongRef.current = new Audio("/assets/sounds/wrong.mp3");
    correctRef.current.volume = 0.5;
    wrongRef.current.volume = 0.5;
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [audioQueue, setAudioQueue] = useState<any[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [startAyah, setStartAyah] = useState(1);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const globalPlaybackRate = useAudioStore((s) => s.playbackRate || 1);
  const [playbackRate, setPlaybackRate] = useState(globalPlaybackRate);

  // Playback Phase for Option 2 (Bilingual / Chained Audio)
  const [phase, setPhase] = useState<"arabic" | "translation">(() => {
    return audioStore.audioMode === "translation" ? "translation" : "arabic";
  });

  // UI state for showing Audio Mode Selection view
  const [showModeSelection, setShowModeSelection] = useState(!audioStore.hasChosenAudioMode);

  useEffect(() => {
    setPlaybackRate(globalPlaybackRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = globalPlaybackRate;
    }
  }, [globalPlaybackRate]);

  // Keep phase aligned when mode changes
  useEffect(() => {
    if (audioStore.audioMode === "translation") {
      setPhase("translation");
      audioStore.setActivePhase("translation");
    } else if (audioStore.audioMode === "arabic") {
      setPhase("arabic");
      audioStore.setActivePhase("arabic");
    } else {
      // Both mode begins with Arabic
      setPhase("arabic");
      audioStore.setActivePhase("arabic");
    }
  }, [audioStore.audioMode]);

  const [recording, setRecording] = useState(false);
  const [showReciteGuide, setShowReciteGuide] = useState(false);

  const [currentAyah, setCurrentAyah] = useState(0);
  const currentAyahRef = useRef(currentAyah);

  const [mobileFabOpen, setMobileFabOpen] = useState(false);
  const showNav = useScrollDirection();

  useEffect(() => {
    if (recording || playing || audioStore.isPlaying) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("close-left-sidebar"));
        document.body.classList.add("no-scrollbar");
        document.documentElement.classList.add("no-scrollbar");
      }
    } else {
      if (typeof window !== "undefined") {
        document.body.classList.remove("no-scrollbar");
        document.documentElement.classList.remove("no-scrollbar");
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        document.body.classList.remove("no-scrollbar");
        document.documentElement.classList.remove("no-scrollbar");
      }
    };
  }, [recording, playing, audioStore.isPlaying]);

  // Keep ref in sync for Speech Recognition
  useEffect(() => {
    currentAyahRef.current = currentAyah;
  }, [currentAyah]);

  // Fetch the segments queue on mount or when surah/reciter changes
  useEffect(() => {
    import("@/api/api").then((module) => {
      module.fetchChapterAudioSegments(selectedReciter || 7, surahNumber).then((res) => {
        if (res?.audio_files) {
          setAudioQueue(res.audio_files);
          setCurrentAyahIndex(startAyah - 1);
        }
      });
    });
  }, [surahNumber, selectedReciter]);

  // URL generator for the active ayah & phase
  const getResolvedAudioUrl = (ayahIdx: number, currentPhase: "arabic" | "translation") => {
    const ayahNum = ayahIdx + 1;
    const globalAyahNum = getGlobalAyahNumber(surahNumber, ayahNum);

    if (currentPhase === "translation") {
      if (audioStore.translationAudioLang === "ur") {
        return `https://cdn.islamic.network/quran/audio/64/ur.khan/${globalAyahNum}.mp3`;
      }
      if (audioStore.englishAudioVoice === "walk_studio") {
        const s = String(surahNumber).padStart(3, "0");
        const a = String(ayahNum).padStart(3, "0");
        return `https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/${s}${a}.mp3`;
      }
      return `https://cdn.islamic.network/quran/audio/192/en.walk/${globalAyahNum}.mp3`;
    }

    // Arabic Recitation
    const currentItem = audioQueue[ayahIdx];
    if (currentItem?.url) {
      let url = currentItem.url;
      if (url.startsWith("//")) {
        return `https:${url}`;
      } else if (!url.startsWith("http")) {
        return `https://audio.qurancdn.com/${url}`;
      }
      return url;
    }
    return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNum}.mp3`;
  };

  // Main Audio Playback Handler
  useEffect(() => {
    if (lastAyahNumber <= 0 || currentAyahIndex >= lastAyahNumber) return;

    const url = getResolvedAudioUrl(currentAyahIndex, phase);
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    
    const currentRate = audioStore.playbackRate || playbackRate || 1;
    audio.defaultPlaybackRate = currentRate;
    audio.src = url;
    audio.load();
    audio.playbackRate = currentRate;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (phase === "arabic" && audioStore.audioMode !== "translation") {
        const currentItem = audioQueue[currentAyahIndex];
        if (currentItem?.segments && currentItem.segments.length > 0) {
          const timeMs = audio.currentTime * 1000;
          let foundWord = null;
          for (const segment of currentItem.segments) {
            if (timeMs >= segment[2] && timeMs <= segment[3]) {
              foundWord = segment[0] + 1; // 1-indexed for frontend
              break;
            }
          }
          audioStore.setCurrentWord(foundWord);
        } else {
          audioStore.setCurrentWord(null);
        }
      } else {
        audioStore.setCurrentWord(null);
      }
    };

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      const activeRate = audioStore.playbackRate || playbackRate || 1;
      audio.defaultPlaybackRate = activeRate;
      audio.playbackRate = activeRate;
    };

    const onPlay = () => {
      const activeRate = audioStore.playbackRate || playbackRate || 1;
      audio.playbackRate = activeRate;
    };

    const onEnded = () => {
      // In "Both" mode: if Arabic just finished, play the translation for this same verse!
      if (audioStore.audioMode === "both" && phase === "arabic") {
        setPhase("translation");
        audioStore.setActivePhase("translation");
        audioStore.setCurrentWord(null);
        return;
      }

      // If translation finished in "both", or if in "arabic" or "translation" mode: advance to next verse
      if (currentAyahIndex + 1 < lastAyahNumber) {
        const nextPhase = audioStore.audioMode === "translation" ? "translation" : "arabic";
        setPhase(nextPhase);
        audioStore.setActivePhase(nextPhase);
        setCurrentAyahIndex((prev) => prev + 1);
      } else {
        // End of Surah
        setPlaying(false);
        audioStore.setIsPlaying(false);
        audioStore.setCurrentAyah(null);
        audioStore.setCurrentWord(null);
        audioStore.setActivePhase(null);
        setPhase(audioStore.audioMode === "translation" ? "translation" : "arabic");
      }
    };

    const onError = () => {
      console.warn("Audio loading error for URL:", url);
      setPlaying(false);
      audioStore.setIsPlaying(false);
      toast.error("Failed to load audio for this verse. Please try again or switch reciter/mode.", { id: "audio-error" });
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Update global state
    const ayahNum = currentAyahIndex + 1;
    audioStore.setCurrentAyah(ayahNum);
    audioStore.setCurrentSurah(surahNumber);
    audioStore.setActivePhase(phase);

    if (playing) {
      audio.playbackRate = currentRate;
      audio.play().catch((e) => console.error("Playback error", e));
      window.dispatchEvent(new CustomEvent("scrollToAyah", { detail: { index: ayahNum - 1 } }));
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [
    currentAyahIndex,
    phase,
    audioStore.audioMode,
    audioStore.translationAudioLang,
    audioStore.englishAudioVoice,
    surahNumber,
    lastAyahNumber,
    audioQueue,
    playbackRate,
  ]);

  // Handle Play/Pause toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.play().catch((e) => console.error(e));
      audioStore.setIsPlaying(true);

      const ayahNum = currentAyahIndex + 1;
      audioStore.setCurrentAyah(ayahNum);
      audioStore.setCurrentSurah(surahNumber);
      audioStore.setActivePhase(phase);
      window.dispatchEvent(new CustomEvent("scrollToAyah", { detail: { index: ayahNum - 1 } }));
    } else {
      audio.pause();
      audioStore.setIsPlaying(false);
    }
  }, [playing]);

  // Window event listeners for external controls
  useEffect(() => {
    const handlePausePlayer = () => {
      setPlaying(false);
      audioStore.setIsPlaying(false);
    };

    const handleChangeAyah = (e: any) => {
      const targetAyah = e.detail?.ayah;
      if (typeof targetAyah === "number" && targetAyah >= 1 && targetAyah <= lastAyahNumber) {
        if (!audioStore.hasChosenAudioMode) {
          setShowModeSelection(true);
          setMobileFabOpen(true);
          setStartAyah(targetAyah);
          setCurrentAyahIndex(targetAyah - 1);
          return;
        }

        const nextPhase = audioStore.audioMode === "translation" ? "translation" : "arabic";
        setPhase(nextPhase);
        audioStore.setActivePhase(nextPhase);
        setCurrentAyahIndex(targetAyah - 1);
        setStartAyah(targetAyah);
        setPlaying(true);
        audioStore.setIsPlaying(true);
        if (e.detail?.openFab) {
          setMobileFabOpen(true);
        }
      }
    };

    window.addEventListener("pausePlayerAudio", handlePausePlayer);
    window.addEventListener("changePlayerAyah", handleChangeAyah);

    return () => {
      window.removeEventListener("pausePlayerAudio", handlePausePlayer);
      window.removeEventListener("changePlayerAyah", handleChangeAyah);
    };
  }, [lastAyahNumber, audioStore.hasChosenAudioMode, audioStore.audioMode]);

  // Audio Controls
  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const skip = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + sec, duration));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSelectModeAndProceed = (mode: AudioMode) => {
    audioStore.setAudioMode(mode);
    setPhase(mode === "translation" ? "translation" : "arabic");
    setShowModeSelection(false);
    setPlaying(true);
    audioStore.setIsPlaying(true);
  };

  // Handle Incorrect Pronunciation of Verse
  const handleIncorrect = async (ayahNum?: number) => {
    wrongRef.current?.play();
    if (mistakeDetection && ayahNum) {
      toast.info("Recitation mistake detected — replaying correct verse audio...");
      try {
        const response = await fetchAyahAudio(surahNumber, ayahNum);
        if (response?.data?.audio) {
          const ayahAudio = new Audio(response.data.audio);
          ayahAudio.play();
        }
      } catch (err) {
        console.error("Failed to play mistake correction audio:", err);
      }
    }
  };

  // Speech Recognition Function
  const startRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (e: any) => {
      const transcript = e.results[e.resultIndex][0].transcript;
      const expected = normalizeArabic(ayahText[currentAyahRef.current]);
      const actual = normalizeArabic(transcript);
      const similarity =
        1 -
        levenshtein(actual, expected) /
          Math.max(actual.length, expected.length);

      const currentAyahId = `ayah-${currentAyahRef.current + 1}`;
      const arabicTextElement = document.getElementById(
        `atext-${currentAyahRef.current + 1}`
      );

      if (similarity > 0.6) {
        correctRef.current?.play();
        arabicTextElement?.classList.add("text-green-500");
        arabicTextElement?.classList.remove("text-red-500");
        document
          .getElementById(currentAyahId)
          ?.classList.remove("bg-accent/15");

        setCurrentAyah((prev) => prev + 1);

        if (currentAyahRef.current + 2 <= lastAyahNumber) {
          window.dispatchEvent(
            new CustomEvent("scrollToAyah", { detail: { index: currentAyahRef.current + 1 } })
          );
          document
            .getElementById(`ayah-${currentAyahRef.current + 2}`)
            ?.classList.add("bg-accent/15");
        } else {
          toast.success("You completed the Surah!");
          setTimeout(() => router.push(`/surah/${surahNumber + 1}`), 1500);
        }
      } else {
        handleIncorrect(currentAyahRef.current + 1);
        document.getElementById(currentAyahId)?.classList.add("text-red-500");
      }
    };

    recognition.onerror = (e: any) =>
      console.error("Speech recognition error:", e.error);
    recognition.start();
  };

  const requestMic = async () => {
    if (recording) {
      setRecording(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecording(true);
      startRecognition();
      document
        .getElementById(`ayah-${currentAyahRef.current + 1}`)
        ?.classList.add("bg-accent/15");
      toast.success("Start reciting aloud. Tap mic again to stop.");
    } catch {
      setRecording(false);
    }
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      {showReciteGuide && (
        <GettingStartedPopup
          onStart={() => {
            unlockAudio();
            requestMic();
            setShowReciteGuide(false);
            localStorage.setItem("hasSeenReciteGuide", "true");
          }}
        />
      )}

      {/* Floating Action Button (FAB) (Mobile + Desktop) */}
      <motion.button
        type="button"
        onClick={() => setMobileFabOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "fixed z-[9999] size-11 md:size-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 ease-in-out cursor-pointer select-none border shadow-md",
          showNav
            ? "bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] md:bottom-8"
            : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:bottom-8",
          mobileFabOpen
            ? "bg-card border-accent text-accent ring-2 ring-accent/25"
            : playing
            ? "bg-accent/15 border-accent/60 text-accent shadow-accent/10"
            : "bg-card/90 border-border hover:border-accent/50 text-muted-foreground hover:text-accent hover:bg-card",
          aiChatContext ? "max-lg:hidden right-4 lg:right-[440px] xl:right-[470px]" : "right-4 md:right-8",
          isWordDialogVisible ? "max-md:hidden" : ""
        )}
        title={mobileFabOpen ? "Close Audio Controls" : "Audio Playback Controls"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mobileFabOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-4.5 md:size-5 text-accent stroke-[2.2]" />
            </motion.div>
          ) : playing ? (
            <motion.div
              key="pause"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Pause className="size-4.5 md:size-5 text-accent" />
            </motion.div>
          ) : (
            <motion.div
              key="audio-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Volume2 className="size-4.5 md:size-5 text-muted-foreground hover:text-accent" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Main Floating Audio Card (Mobile + Desktop) */}
      {mobileFabOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          className={cn(
            "fixed z-[9999] w-72 md:w-80 bg-card border border-accent/40 rounded-2xl p-4 backdrop-blur-2xl space-y-3.5 text-foreground transition-all duration-300 ease-in-out max-h-[85vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-xl",
            showNav
              ? "bottom-[calc(10.25rem+env(safe-area-inset-bottom,0px))] md:bottom-[5.5rem]"
              : "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-[5.5rem]",
            aiChatContext ? "max-lg:hidden right-4 lg:right-[440px] xl:right-[470px]" : "right-4 md:right-8"
          )}
        >
          {/* VIEW A: Audio Mode Selection Screen */}
          {showModeSelection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Audio Experience</h4>
                  <p className="text-[11px] text-muted-foreground">Select how you want to listen</p>
                </div>
                <button
                  onClick={() => setMobileFabOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Close"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              {/* 3 Mode Selection Cards */}
              <div className="space-y-2 pt-1">
                {/* 1. Arabic Recitation */}
                <button
                  type="button"
                  onClick={() => handleSelectModeAndProceed("arabic")}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer",
                    audioStore.audioMode === "arabic"
                      ? "bg-accent/10 border-accent/60 text-foreground ring-1 ring-accent/30"
                      : "bg-card/70 border-border hover:border-accent/40 hover:bg-muted/50"
                  )}
                >
                  <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Arabic Recitation</span>
                      <span className="text-[10px] font-arabic text-accent">العربية</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Classical Quranic recitation with word tracking</p>
                  </div>
                </button>

                {/* 2. Arabic + Translation (Both) */}
                <button
                  type="button"
                  onClick={() => handleSelectModeAndProceed("both")}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer",
                    audioStore.audioMode === "both"
                      ? "bg-accent/10 border-accent/60 text-foreground ring-1 ring-accent/30"
                      : "bg-card/70 border-border hover:border-accent/40 hover:bg-muted/50"
                  )}
                >
                  <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Arabic + Translation</span>
                      <span className="text-[10px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 rounded">Bilingual</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Recites Arabic verse, then speaks its translation</p>
                  </div>
                </button>

                {/* 3. Translation Only */}
                <button
                  type="button"
                  onClick={() => handleSelectModeAndProceed("translation")}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer",
                    audioStore.audioMode === "translation"
                      ? "bg-accent/10 border-accent/60 text-foreground ring-1 ring-accent/30"
                      : "bg-card/70 border-border hover:border-accent/40 hover:bg-muted/50"
                  )}
                >
                  <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                    <Languages className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Translation Only</span>
                      <span className="text-[10px] text-accent font-medium">English / اردو</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Clear audio translation verse-by-verse</p>
                  </div>
                </button>
              </div>

              {/* Translation Voice Language & Options Selector */}
              {(audioStore.audioMode === "translation" || audioStore.audioMode === "both") && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                      Translation Language:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => audioStore.setTranslationAudioLang("en")}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer",
                          audioStore.translationAudioLang === "en"
                            ? "bg-accent text-foreground font-semibold border-accent shadow-sm"
                            : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => audioStore.setTranslationAudioLang("ur")}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer font-urdu",
                          audioStore.translationAudioLang === "ur"
                            ? "bg-accent text-foreground font-semibold border-accent shadow-sm"
                            : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        اردو (شمشاد علی خان)
                      </button>
                    </div>
                  </div>

                  {audioStore.translationAudioLang === "en" && (
                    <div className="bg-card/40 border border-border/60 rounded-xl p-2.5">
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                        English Voice Quality:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => audioStore.setEnglishAudioVoice("walk_studio")}
                          className={cn(
                            "py-1.5 px-2 rounded-lg text-[11px] font-medium border text-left transition cursor-pointer flex flex-col",
                            audioStore.englishAudioVoice === "walk_studio"
                              ? "bg-accent/20 text-accent font-semibold border-accent/40 shadow-xs"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          <span className="font-semibold text-foreground">Studio Master</span>
                          <span className="text-[10px] text-muted-foreground">Warmer & Natural</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => audioStore.setEnglishAudioVoice("walk_classic")}
                          className={cn(
                            "py-1.5 px-2 rounded-lg text-[11px] font-medium border text-left transition cursor-pointer flex flex-col",
                            audioStore.englishAudioVoice === "walk_classic"
                              ? "bg-accent/20 text-accent font-semibold border-accent/40 shadow-xs"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          <span className="font-semibold text-foreground">Standard</span>
                          <span className="text-[10px] text-muted-foreground">Original Stream</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button to Open Player */}
              <button
                type="button"
                onClick={() => {
                  audioStore.setHasChosenAudioMode(true);
                  setShowModeSelection(false);
                  setPlaying(true);
                }}
                className="w-full py-2 bg-accent hover:bg-accent/90 text-foreground font-semibold rounded-xl text-xs shadow-md transition cursor-pointer mt-2"
              >
                Confirm & Start Player
              </button>
            </div>
          ) : (
            /* VIEW B: Our Typical UI for the Audio */
            <div className="space-y-3">
              {/* Header with Mode Badge & Mode Switcher Button */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">Recitation Player</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowModeSelection(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-[10px] font-medium text-accent hover:bg-accent/15 transition cursor-pointer"
                    title="Change Audio Mode"
                  >
                    <SlidersHorizontal className="size-3" />
                    <span>
                      {audioStore.audioMode === "both"
                        ? `Both (${audioStore.translationAudioLang === "ur" ? "Urdu" : "Eng"})`
                        : audioStore.audioMode === "translation"
                        ? `Translation (${audioStore.translationAudioLang === "ur" ? "Urdu" : "Eng"})`
                        : "Arabic"}
                    </span>
                  </button>
                  <button
                    onClick={() => setMobileFabOpen(false)}
                    className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="Close"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>

              {/* Inline Quick Mode Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => audioStore.setAudioMode("arabic")}
                  className={cn(
                    "py-1 rounded-lg text-[11px] font-medium transition cursor-pointer",
                    audioStore.audioMode === "arabic"
                      ? "bg-accent text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Arabic
                </button>
                <button
                  type="button"
                  onClick={() => audioStore.setAudioMode("both")}
                  className={cn(
                    "py-1 rounded-lg text-[11px] font-medium transition cursor-pointer",
                    audioStore.audioMode === "both"
                      ? "bg-accent text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => audioStore.setAudioMode("translation")}
                  className={cn(
                    "py-1 rounded-lg text-[11px] font-medium transition cursor-pointer",
                    audioStore.audioMode === "translation"
                      ? "bg-accent text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Translation
                </button>
              </div>

              {/* Inline Language Selector (if Both or Translation) */}
              {(audioStore.audioMode === "translation" || audioStore.audioMode === "both") && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between px-1 text-[11px]">
                    <span className="text-muted-foreground">Language:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => audioStore.setTranslationAudioLang("en")}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border",
                          audioStore.translationAudioLang === "en"
                            ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => audioStore.setTranslationAudioLang("ur")}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border font-urdu",
                          audioStore.translationAudioLang === "ur"
                            ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        اردو (خان)
                      </button>
                    </div>
                  </div>

                  {audioStore.translationAudioLang === "en" && (
                    <div className="flex items-center justify-between px-1 text-[11px]">
                      <span className="text-muted-foreground">Voice Audio:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => audioStore.setEnglishAudioVoice("walk_studio")}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border",
                            audioStore.englishAudioVoice === "walk_studio"
                              ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                          title="High-bitrate studio master with natural sound"
                        >
                          Studio Master
                        </button>
                        <button
                          type="button"
                          onClick={() => audioStore.setEnglishAudioVoice("walk_classic")}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border",
                            audioStore.englishAudioVoice === "walk_classic"
                              ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                          title="Standard original audio stream"
                        >
                          Standard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Playing Status Pill */}
              <div className="flex items-center justify-between bg-card/80 border border-border/60 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Now:</span>
                <span className="font-medium text-accent truncate">
                  Ayah {currentAyahIndex + 1}
                  {playing && (
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">
                      {phase === "translation"
                        ? `• Speaking ${audioStore.translationAudioLang === "ur" ? "Urdu" : "English"}`
                        : "• Reciting Arabic"}
                    </span>
                  )}
                </span>
              </div>

              {/* Start Ayah Selector */}
              <div className="flex items-center justify-between bg-card/80 rounded-xl px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Start Ayah:</span>
                <select
                  className="bg-transparent text-foreground text-xs outline-none cursor-pointer"
                  value={startAyah}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStartAyah(val);
                    setPhase(audioStore.audioMode === "translation" ? "translation" : "arabic");
                    setCurrentAyahIndex(val - 1);
                    setPlaying(false);
                    window.dispatchEvent(
                      new CustomEvent("scrollToAyah", { detail: { index: val - 1 } })
                    );
                  }}
                >
                  {Array.from({ length: lastAyahNumber }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num} className="bg-muted">
                      {num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4 py-1">
                <button
                  type="button"
                  onClick={() => skip(-10)}
                  className="p-2 bg-muted hover:bg-muted/80 rounded-full text-foreground transition cursor-pointer"
                  title="Rewind 10 seconds"
                >
                  <SkipBackIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="p-3 bg-accent hover:bg-accent/90 rounded-full text-foreground shadow-lg transition cursor-pointer"
                  title={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => skip(10)}
                  className="p-2 bg-muted hover:bg-muted/80 rounded-full text-foreground transition cursor-pointer"
                  title="Forward 10 seconds"
                >
                  <SkipForwardIcon className="size-4" />
                </button>
              </div>

              {/* Interactive Progress Bar & Time */}
              <div className="space-y-1">
                <div
                  onClick={handleSeek}
                  className="w-full h-1.5 bg-muted rounded-full cursor-pointer relative overflow-hidden"
                  title="Click to seek"
                >
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center justify-center gap-1 bg-card/80 p-1 rounded-xl">
                {playbackRates.slice(2, 6).map((rate) => {
                  const isActive = (audioStore.playbackRate || playbackRate) === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        audioStore.setPlaybackRate(rate);
                        setPlaybackRate(rate);
                        if (audioRef.current) {
                          audioRef.current.defaultPlaybackRate = rate;
                          audioRef.current.playbackRate = rate;
                        }
                      }}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                        isActive
                          ? "bg-accent text-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {rate}×
                    </button>
                  );
                })}
              </div>

              {/* Reciter Selector (When Arabic or Both) */}
              {audioStore.audioMode !== "translation" && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] text-muted-foreground">Arabic Reciter:</span>
                  <select
                    className="bg-card/80 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none cursor-pointer w-full"
                    value={selectedReciter || 7}
                    onChange={(e) => {
                      setSelectedReciter(Number(e.target.value));
                      setPlaying(false);
                    }}
                  >
                    {reciters.map((r) => (
                      <option key={r.id} value={r.id} className="bg-muted">
                        {r.reciter_name} {r.style ? `(${r.style})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recite Mic Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (localStorage.getItem("hasSeenReciteGuide") === "true") {
                    unlockAudio();
                    requestMic();
                  } else {
                    setShowReciteGuide(true);
                  }
                }}
                className={cn(
                  "w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border transition cursor-pointer",
                  recording
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-muted/80 border-border text-reading hover:bg-muted"
                )}
              >
                <Mic className="size-4 text-accent" />
                <span>{recording ? "Recording Active..." : "Voice Recite Assistant"}</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
