"use client";

import React, { useEffect, useRef, useState } from "react";
//  ^^^ React Basic Imports
import { motion, AnimatePresence } from "framer-motion";
// Framer Motion for Animations

// Icons
import {
  Pause,
  SkipForwardIcon,
  SkipBackIcon,
  ChevronDown,
  ChevronUp,
  Play,
  Mic,
  MicOff,
  BookOpen,
  X
} from "lucide-react";

// Package/Library to check similarity between sentences
import levenshtein from "js-levenshtein";
// ShadCN UI
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "sonner";

// Components
import GettingStartedPopup from "./popups/GettingStartedPopup";
// Utilities
import { formatTime, normalizeArabic, unlockAudio, cn } from "@/lib/utils";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { fetchAyahAudio } from "@/api/api";
import { useAudioStore } from "@/lib/stores/audioStore";

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

  // Audio effects
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
  const globalPlaybackRate = useAudioStore(s => s.playbackRate || 1);
  const [playbackRate, setPlaybackRate] = useState(globalPlaybackRate);

  useEffect(() => {
    setPlaybackRate(globalPlaybackRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = globalPlaybackRate;
    }
  }, [globalPlaybackRate]);

  const [recording, setRecording] = useState(false);
  const [showReciteGuide, setShowReciteGuide] = useState(false);

  const [currentAyah, setCurrentAyah] = useState(0);
  const currentAyahRef = useRef(currentAyah);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);

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

  // Keep ref in sync for SR
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

  // Handle QUL Audio Queue Playback
  useEffect(() => {
    if (audioQueue.length === 0 || currentAyahIndex >= audioQueue.length) return;

    const currentItem = audioQueue[currentAyahIndex];
    let url = currentItem.url;
    if (url.startsWith('//')) {
      url = `https:${url}`;
    } else if (!url.startsWith('http')) {
      url = `https://audio.qurancdn.com/${url}`;
    }

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
      if (currentItem.segments && currentItem.segments.length > 0) {
        const timeMs = audio.currentTime * 1000;
        let foundWord = null;
        for (const segment of currentItem.segments) {
          if (timeMs >= segment[2] && timeMs <= segment[3]) {
             foundWord = segment[0] + 1; // API is 0-indexed, frontend is 1-indexed
             break;
          }
        }
        audioStore.setCurrentWord(foundWord);
      } else {
        audioStore.setCurrentWord(null);
      }
    };
    
    const onLoaded = () => {
      setDuration(audio.duration);
      const activeRate = audioStore.playbackRate || playbackRate || 1;
      audio.defaultPlaybackRate = activeRate;
      audio.playbackRate = activeRate;
    };
    const onPlay = () => {
      const activeRate = audioStore.playbackRate || playbackRate || 1;
      audio.playbackRate = activeRate;
    };
    const onEnded = () => {
      if (currentAyahIndex + 1 < audioQueue.length) {
        setCurrentAyahIndex(prev => prev + 1);
      } else {
        setPlaying(false);
        audioStore.setIsPlaying(false);
        audioStore.setCurrentAyah(null);
        audioStore.setCurrentWord(null);
      }
    };
    const onError = () => {
      setPlaying(false);
      audioStore.setIsPlaying(false);
      toast.error("Failed to load audio for this reciter. Please change the speaker in Settings.", { id: 'audio-error' });
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Update global state
    const ayahNum = parseInt(currentItem.verse_key.split(":")[1]);
    audioStore.setCurrentAyah(ayahNum);
    audioStore.setCurrentSurah(surahNumber);
    
    // Play automatically if playing is true (e.g. moving to next ayah)
    if (playing) {
      audio.playbackRate = currentRate;
      audio.play().catch(e => console.error("Playback error", e));
      window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: ayahNum - 1 } }));
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [currentAyahIndex, audioQueue, playbackRate]); // Don't add playing here to prevent restart

  // Separately handle play/pause toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (playing) {
      setMobileFabOpen(false);
      audio.play().catch(e => console.error(e));
      audioStore.setIsPlaying(true);
      
      if (audioQueue[currentAyahIndex]) {
        const ayahNum = parseInt(audioQueue[currentAyahIndex].verse_key.split(":")[1]);
        audioStore.setCurrentAyah(ayahNum);
        audioStore.setCurrentSurah(surahNumber);
        window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: ayahNum - 1 } }));
      }
    } else {
      audio.pause();
      audioStore.setIsPlaying(false);
    }
  }, [playing]);

  useEffect(() => {
    const handlePausePlayer = () => {
      setPlaying(false);
      audioStore.setIsPlaying(false);
    };

    const handleChangeAyah = (e: any) => {
      const targetAyah = e.detail?.ayah;
      if (typeof targetAyah === 'number' && targetAyah >= 1 && targetAyah <= lastAyahNumber) {
        setCurrentAyahIndex(targetAyah - 1);
        setStartAyah(targetAyah);
        setPlaying(true);
        audioStore.setIsPlaying(true);
        if (e.detail?.openFab) {
          setMobileFabOpen(true);
        }
      }
    };

    window.addEventListener('pausePlayerAudio', handlePausePlayer);
    window.addEventListener('changePlayerAyah', handleChangeAyah);

    return () => {
      window.removeEventListener('pausePlayerAudio', handlePausePlayer);
      window.removeEventListener('changePlayerAyah', handleChangeAyah);
    };
  }, [lastAyahNumber]);

  // Audio Controls
  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const skip = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.currentTime + sec, duration)
    );
  };

  // Handle Incorrect Pronounciation of Verse
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

  // ================- SPEECH RECOGNITION FUNCTION -================!
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
          window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: currentAyahRef.current + 1 } }));
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
      {/* Floating Action Button (FAB) & Vertical Controls Card (Mobile + Desktop) */}
      <motion.button
        type="button"
        onClick={() => setMobileFabOpen((prev) => !prev)}
        whileTap={{ scale: 0.92 }}
        className={cn(
          "fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] md:bottom-8 z-[9999] size-11 md:size-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer select-none border shadow-md",
          mobileFabOpen
            ? "bg-card border-accent text-accent ring-2 ring-accent/25"
            : playing
            ? "bg-accent/15 border-accent/60 text-accent shadow-accent/10"
            : "bg-card/90 border-border hover:border-accent/50 text-muted-foreground hover:text-accent hover:bg-card",
          aiChatContext ? "max-lg:hidden right-4 lg:right-[440px] xl:right-[470px]" : "right-4 md:right-8",
          isWordDialogVisible ? "max-md:hidden" : ""
        )}
        title={mobileFabOpen ? "Close Recitation Controls" : "Audio Recitation Controls"}
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
              key="mic"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Mic className={`size-4.5 md:size-5 ${recording ? "text-accent animate-pulse" : "currentColor"}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {mobileFabOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          className={cn(
            "fixed bottom-[calc(10.25rem+env(safe-area-inset-bottom,0px))] md:bottom-[5.5rem] z-[9999] w-64 md:w-72 bg-card border border-accent/40 rounded-2xl p-4  backdrop-blur-2xl space-y-4 text-foreground transition-all duration-300 max-h-[85vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            aiChatContext ? "max-lg:hidden right-4 lg:right-[440px] xl:right-[470px]" : "right-4 md:right-8"
          )}
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Recitation Player</span>
            <button onClick={() => setMobileFabOpen(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer">
              <ChevronDown className="size-4" />
            </button>
          </div>

              {/* Start Ayah Selector Mobile */}
              <div className="flex items-center justify-between bg-card/80 rounded-xl px-3 py-2">
                 <span className="text-xs text-muted-foreground">Start Ayah:</span>
                 <select 
                   className="bg-transparent text-foreground text-xs outline-none cursor-pointer"
                   value={startAyah}
                   onChange={(e) => {
                     const val = Number(e.target.value);
                     setStartAyah(val);
                     setCurrentAyahIndex(val - 1);
                     setPlaying(false);
                     window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: val - 1 } }));
                   }}
                 >
                   {Array.from({ length: lastAyahNumber }, (_, i) => i + 1).map(num => (
                     <option key={num} value={num} className="bg-muted">{num}</option>
                   ))}
                 </select>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4 py-1">
                <button onClick={() => skip(-10)} className="p-2 bg-muted hover:bg-muted rounded-full text-foreground">
                  <SkipBackIcon className="size-4" />
                </button>
                <button onClick={handlePlayPause} className="p-3 bg-accent hover:bg-accent rounded-full text-foreground shadow-lg">
                  {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
                </button>
                <button onClick={() => skip(10)} className="p-2 bg-muted hover:bg-muted rounded-full text-foreground">
                  <SkipForwardIcon className="size-4" />
                </button>
              </div>

              {/* Time / Progress */}
              <div className="text-center font-mono text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Speed Selector */}
              <div className="flex items-center justify-center gap-1 bg-card/80 p-1 rounded-xl">
                {playbackRates.slice(2, 6).map((rate) => {
                  const isActive = (audioStore.playbackRate || playbackRate) === rate;
                  return (
                    <button
                      key={rate}
                      onClick={() => {
                        audioStore.setPlaybackRate(rate);
                        setPlaybackRate(rate);
                        if (audioRef.current) {
                          audioRef.current.defaultPlaybackRate = rate;
                          audioRef.current.playbackRate = rate;
                        }
                      }}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                        isActive ? "bg-accent text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rate}×
                    </button>
                  );
                })}
              </div>

              {/* Reciter Selector */}
              <div className="flex flex-col gap-1 mt-2">
                 <span className="text-xs text-muted-foreground">Reciter:</span>
                 <select 
                   className="bg-card/80 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none cursor-pointer w-full"
                   value={selectedReciter || 7}
                   onChange={(e) => {
                     setSelectedReciter(Number(e.target.value));
                     setPlaying(false);
                   }}
                 >
                   {reciters.map(r => (
                     <option key={r.id} value={r.id} className="bg-muted">
                       {r.reciter_name} {r.style ? `(${r.style})` : ''}
                     </option>
                   ))}
                 </select>
              </div>

              {/* Recite Mic Toggle */}
              <button
                onClick={() => {
                  if (localStorage.getItem("hasSeenReciteGuide") === "true") {
                    unlockAudio();
                    requestMic();
                  } else {
                    setShowReciteGuide(true);
                  }
                }}
                className={`w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border transition ${
                  recording
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-muted/80 border-border text-reading hover:bg-muted"
                }`}
              >
                <Mic className="size-4 text-accent" />
                <span>{recording ? "Recording Active..." : "Voice Recite Assistant"}</span>
              </button>
            </motion.div>
          )}

    </AnimatePresence>
  );
}
