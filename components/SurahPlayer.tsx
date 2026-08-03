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
  BookOpen
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
import { formatTime, normalizeArabic, unlockAudio } from "@/lib/utils";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { fetchAyahAudio } from "@/api/api";
import { useAudioStore } from "@/lib/stores/audioStore";

interface SurahPlayerProps {
  surahNumber: number;
  ayahText: string[];
  lastAyahNumber: number;
  router: any;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function SurahPlayer({
  surahNumber,
  ayahText,
  lastAyahNumber,
  router,
}: SurahPlayerProps) {
  const { mistakeDetection, selectedReciter, setSelectedReciter } = useGlobalState();
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
  const [playbackRate, setPlaybackRate] = useState(1);

  const [recording, setRecording] = useState(false);
  const [showReciteGuide, setShowReciteGuide] = useState(false);

  const [currentAyah, setCurrentAyah] = useState(0);
  const currentAyahRef = useRef(currentAyah);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileFabOpen, setMobileFabOpen] = useState(false);

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
    
    // Pause previous playback if any, but since we are replacing src, it's fine.
    audio.src = url;
    audio.playbackRate = playbackRate;
    audio.load();

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
    
    const onLoaded = () => setDuration(audio.duration);
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
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Update global state
    const ayahNum = parseInt(currentItem.verse_key.split(":")[1]);
    audioStore.setCurrentAyah(ayahNum);
    
    // Play automatically if playing is true (e.g. moving to next ayah)
    if (playing) {
      audio.play().catch(e => console.error("Playback error", e));
      window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: ayahNum - 1 } }));
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [currentAyahIndex, audioQueue, playbackRate]); // Don't add playing here to prevent restart

  // Separately handle play/pause toggle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (playing) {
      audio.play().catch(e => console.error(e));
      audioStore.setIsPlaying(true);
      
      if (audioQueue[currentAyahIndex]) {
        const ayahNum = parseInt(audioQueue[currentAyahIndex].verse_key.split(":")[1]);
        audioStore.setCurrentAyah(ayahNum);
        window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: ayahNum - 1 } }));
      }
    } else {
      audio.pause();
      audioStore.setIsPlaying(false);
    }
  }, [playing]);

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
          ?.classList.remove("bg-zinc-800/75");

        setCurrentAyah((prev) => prev + 1);

        if (currentAyahRef.current + 2 <= lastAyahNumber) {
          window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: currentAyahRef.current + 1 } }));
          document
            .getElementById(`ayah-${currentAyahRef.current + 2}`)
            ?.classList.add("bg-zinc-800/75");
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
        ?.classList.add("bg-zinc-800/75"); 
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
      <div>
        <button
          onClick={() => setMobileFabOpen(!mobileFabOpen)}
          className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] right-4 md:right-8 z-50 size-12 md:size-14 rounded-full bg-emerald-600 border border-emerald-400/40 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Audio Recitation Controls"
        >
          {playing ? (
            <Pause className="size-5 md:size-6" />
          ) : recording ? (
            <Mic className="size-5 md:size-6 text-emerald-300 animate-pulse" />
          ) : (
            <Mic className="size-5 md:size-6 text-white" />
          )}
        </button>

        {mobileFabOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-[calc(10.25rem+env(safe-area-inset-bottom,0px))] right-4 md:right-8 z-50 w-64 bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-4 text-white"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recitation Player</span>
              <button onClick={() => setMobileFabOpen(false)} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                <ChevronDown className="size-4" />
              </button>
            </div>

            {/* Start Ayah Selector Mobile */}
            <div className="flex items-center justify-between bg-zinc-950/60 rounded-xl px-3 py-2">
               <span className="text-xs text-zinc-400">Start Ayah:</span>
               <select 
                 className="bg-transparent text-white text-xs outline-none cursor-pointer"
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
                   <option key={num} value={num} className="bg-zinc-800">{num}</option>
                 ))}
               </select>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 py-1">
              <button onClick={() => skip(-10)} className="p-2 bg-zinc-800/80 hover:bg-zinc-800 rounded-full text-white">
                <SkipBackIcon className="size-4" />
              </button>
              <button onClick={handlePlayPause} className="p-3 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white shadow-lg">
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button onClick={() => skip(10)} className="p-2 bg-zinc-800/80 hover:bg-zinc-800 rounded-full text-white">
                <SkipForwardIcon className="size-4" />
              </button>
            </div>

            {/* Time / Progress */}
            <div className="text-center font-mono text-xs text-zinc-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Speed Selector */}
            <div className="flex items-center justify-center gap-1 bg-zinc-950/60 p-1 rounded-xl">
              {playbackRates.slice(2, 6).map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                    playbackRate === rate ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>

            {/* Reciter Selector */}
            <div className="flex flex-col gap-1 mt-2">
               <span className="text-xs text-zinc-400">Reciter:</span>
               <select 
                 className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer w-full"
                 value={selectedReciter || 7}
                 onChange={(e) => {
                   setSelectedReciter(Number(e.target.value));
                   setPlaying(false);
                 }}
               >
                 {reciters.map(r => (
                   <option key={r.id} value={r.id} className="bg-zinc-800">
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
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Mic className="size-4 text-emerald-400" />
              <span>{recording ? "Recording Active..." : "Voice Recite Assistant"}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Desktop-only Go to Ayah FAB */}
      <div className="hidden md:block fixed bottom-[calc(6.75rem+4.5rem)] right-8 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="size-14 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-xl flex items-center justify-center transition-all hover:scale-105 hover:bg-zinc-700 active:scale-95"
              title="Go to Verse"
            >
              <BookOpen className="size-6" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" className="w-56 bg-zinc-900 border-zinc-800 rounded-2xl p-4 shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-3 border-b border-zinc-800 pb-2">Go to Ayah</span>
            <select
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none cursor-pointer"
              defaultValue=""
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val > 0) {
                  window.dispatchEvent(new CustomEvent('scrollToAyah', { detail: { index: val - 1 } }));
                  // Highlight
                  setTimeout(() => {
                    const element = document.getElementById(`ayah-${val}`);
                    if (element) {
                      const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
                      element.classList.add(...c);
                      setTimeout(() => element.classList.remove(...c), 2000);
                    }
                  }, 300);
                }
                e.target.value = "";
              }}
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-400">Select Verse...</option>
              {Array.from({ length: lastAyahNumber }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-zinc-800">Ayah {num}</option>
              ))}
            </select>
          </PopoverContent>
        </Popover>
      </div>
    </AnimatePresence>
  );
}
