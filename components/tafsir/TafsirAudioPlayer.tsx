"use client";

/**
 * components/tafsir/TafsirAudioPlayer.tsx
 *
 * A minimal, reverent audio player for Tafsir text.
 * - Plays tafsir text using the browser's free Web Speech API
 * - Switches voice mid-sentence for embedded Arabic ayah quotations
 * - Highlights the currently-spoken paragraph
 * - Supports Urdu, Arabic, and English voice selection
 * - Only one player is active at a time (coordinated via tafsirAudioStore)
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Play, Pause, Square, Volume2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLangCode, LANG_LABEL, type TtsLang } from "@/lib/tts/langUtils";
import { extractTafsirSegments, type TtsSegment } from "@/lib/tts/tafsirTextExtractor";
import {
  ttsPlay,
  ttsPause,
  ttsResume,
  ttsStop,
  getLangVoices,
  type TtsStatus,
} from "@/lib/tts/webSpeechTTS";
import {
  useTafsirAudioStore,
} from "@/lib/stores/tafsirAudioStore";

interface TafsirAudioPlayerProps {
  /** Raw tafsir HTML or plain text from the DB */
  tafsirText: string;
  /** Language name from the API (e.g. "English", "Urdu", "Arabic") */
  langName: string;
  /** Unique key for this ayah card: "{surahId}:{ayahNum}:{authorId}" */
  ayahKey: string;
  /** Called with segment index when playback position changes (for highlight sync) */
  onSegmentActive?: (index: number | null) => void;
  className?: string;
}

const RATE_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
type Rate = (typeof RATE_OPTIONS)[number];

export default function TafsirAudioPlayer({
  tafsirText,
  langName,
  ayahKey,
  onSegmentActive,
  className,
}: TafsirAudioPlayerProps) {
  const { playingKey, setPlayingKey, globalRate, setGlobalRate, voicePrefs, setVoicePref } =
    useTafsirAudioStore();

  const baseLang = getLangCode(langName) as TtsLang;
  const isThisPlaying = playingKey === ayahKey;

  const [status, setStatus] = useState<TtsStatus>("idle");
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Voice options for the tafsir's primary language (and Arabic for switch-voices)
  const [primaryVoices, setPrimaryVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [arabicVoices, setArabicVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);

  // ── Load voices (async on first call) ───────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      setPrimaryVoices(getLangVoices(baseLang));
      setArabicVoices(getLangVoices("ar"));
      setVoicesLoaded(true);
    };

    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
    };
  }, [baseLang]);

  // ── If another card starts playing, stop this one ───────────────────────
  useEffect(() => {
    if (playingKey !== null && playingKey !== ayahKey && isThisPlaying === false) {
      // This card is NOT the playing one — make sure UI resets
      if (status !== "idle" && status !== "ended") {
        setStatus("idle");
        setActiveSegmentIdx(null);
        onSegmentActive?.(null);
      }
    }
  }, [playingKey, ayahKey, isThisPlaying, status, onSegmentActive]);

  // ── Close settings on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  // ── Compute segments (memoised) ──────────────────────────────────────────
  const segments = React.useMemo<TtsSegment[]>(() => {
    if (!tafsirText) return [];
    return extractTafsirSegments(tafsirText, baseLang);
  }, [tafsirText, baseLang]);

  // ── Controls ─────────────────────────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (segments.length === 0) return;

    // Stop any other playing card
    if (playingKey && playingKey !== ayahKey) {
      ttsStop();
    }

    setPlayingKey(ayahKey);
    setStatus("playing");
    setActiveSegmentIdx(0);

    ttsPlay({
      segments,
      voicePrefs,
      rate: globalRate,
      onSegmentStart: (idx) => {
        setActiveSegmentIdx(idx);
        onSegmentActive?.(idx);
      },
      onStatusChange: (s) => {
        setStatus(s);
        if (s === "ended" || s === "idle") {
          setActiveSegmentIdx(null);
          onSegmentActive?.(null);
          setPlayingKey(null);
        }
      },
      onEnd: () => {
        setStatus("ended");
        setActiveSegmentIdx(null);
        onSegmentActive?.(null);
        setPlayingKey(null);
      },
    });
  }, [segments, voicePrefs, globalRate, ayahKey, playingKey, setPlayingKey, onSegmentActive]);

  const handlePause = useCallback(() => {
    ttsPause();
    setStatus("paused");
  }, []);

  const handleResume = useCallback(() => {
    ttsResume();
    setStatus("playing");
  }, []);

  const handleStop = useCallback(() => {
    ttsStop();
    setStatus("idle");
    setActiveSegmentIdx(null);
    onSegmentActive?.(null);
    setPlayingKey(null);
  }, [setPlayingKey, onSegmentActive]);

  // ── Current primary voice name ────────────────────────────────────────────
  const currentPrimaryVoiceName = voicePrefs[baseLang] || primaryVoices[0]?.name || "";
  const currentArabicVoiceName = voicePrefs["ar"] || arabicVoices[0]?.name || "";

  // ── Render nothing if no content ─────────────────────────────────────────
  if (!tafsirText || segments.length === 0) return null;

  const isPlaying = status === "playing" && isThisPlaying;
  const isPaused = status === "paused" && isThisPlaying;
  const isActive = isPlaying || isPaused;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 pt-3 border-t border-border/60",
        className
      )}
    >
      {/* ── Main controls row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play / Pause / Resume */}
        {!isActive ? (
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/25 hover:bg-accent/20 text-accent text-xs font-semibold transition-all cursor-pointer"
            title="Play Tafsir aloud"
          >
            <Volume2 className="size-3.5 shrink-0" />
            <span>Listen</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 text-accent text-xs font-semibold transition-all cursor-pointer"
                title="Pause"
              >
                <Pause className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 text-accent text-xs font-semibold transition-all cursor-pointer"
                title="Resume"
              >
                <Play className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Resume</span>
              </button>
            )}
            <button
              onClick={handleStop}
              className="flex items-center justify-center size-7 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Stop"
            >
              <Square className="size-3" />
            </button>
          </div>
        )}

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {RATE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setGlobalRate(r)}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer",
                globalRate === r
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
              title={`${r}× speed`}
            >
              {r}×
            </button>
          ))}
        </div>

        {/* Voice settings toggle */}
        {voicesLoaded && (primaryVoices.length > 0 || arabicVoices.length > 0) && (
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                showSettings
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
              title="Voice settings"
            >
              <span className="hidden sm:inline">Voice</span>
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  showSettings && "rotate-180"
                )}
              />
            </button>

            {/* Voice settings dropdown */}
            {showSettings && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Voice Settings
                </p>

                {/* Primary language voice */}
                {primaryVoices.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      {LANG_LABEL[baseLang]} voice
                    </label>
                    <select
                      value={currentPrimaryVoiceName}
                      onChange={(e) => setVoicePref(baseLang, e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {primaryVoices.map((v) => {
                        const isNatural = /natural|neural|online|google|premium|enhanced/i.test(v.name);
                        return (
                          <option key={v.name} value={v.name}>
                            {isNatural ? "✨ " : ""}{v.name} ({v.lang})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Arabic voice (for embedded ayah quotations) */}
                {baseLang !== "ar" && arabicVoices.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Arabic voice{" "}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (for quoted ayahs)
                      </span>
                    </label>
                    <select
                      value={currentArabicVoiceName}
                      onChange={(e) => setVoicePref("ar", e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {arabicVoices.map((v) => {
                        const isNatural = /natural|neural|online|google|premium|enhanced/i.test(v.name);
                        return (
                          <option key={v.name} value={v.name}>
                            {isNatural ? "✨ " : ""}{v.name} ({v.lang})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {primaryVoices.length === 0 && arabicVoices.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No voices for {LANG_LABEL[baseLang]} found. Install the language pack in your
                    system settings for best quality.
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
                  Using free browser voices — no API key required.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Now-playing pulse indicator */}
        {isPlaying && (
          <div className="flex items-center gap-1 ml-1" aria-label="Playing">
            {[0, 0.15, 0.3].map((delay) => (
              <span
                key={delay}
                className="block w-0.5 rounded-full bg-accent animate-[audioBar_0.8s_ease-in-out_infinite]"
                style={{
                  animationDelay: `${delay}s`,
                  height: "12px",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── No-voice warning ──────────────────────────────────────────────── */}
      {voicesLoaded && primaryVoices.length === 0 && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          No {LANG_LABEL[baseLang]} voice installed. Audio will use a default fallback.{" "}
          <span className="text-accent">
            Install the {LANG_LABEL[baseLang]} language pack in Windows Settings → Time &amp; Language for
            best quality.
          </span>
        </p>
      )}
    </div>
  );
}
