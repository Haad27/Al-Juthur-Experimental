"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Youtube,
  X,
  ExternalLink,
  FastForward,
  Rewind,
  Sparkles,
  Minimize2,
  Layers,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getDrIsrarMedia } from "@/lib/bayanUlQuranMedia";
import { useDrIsrarPlayer } from "@/lib/providers/DrIsrarPlayerContext";

interface DrIsrarMediaCardProps {
  surahNumber: number;
  surahName: string;
  arabicName?: string;
}

export default function DrIsrarMediaCard({
  surahNumber,
  surahName,
  arabicName,
}: DrIsrarMediaCardProps) {
  const media = getDrIsrarMedia(surahNumber, surahName);
  const player = useDrIsrarPlayer();

  // Audio state
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isRetryingAudio, setIsRetryingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active audio URL based on selected part
  const currentAudioUrl =
    media.audioParts.length > 0 && media.audioParts[selectedPartIndex]
      ? media.audioParts[selectedPartIndex].url
      : media.audioUrl;

  // Reset state when surah changes
  useEffect(() => {
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setCurrentTime(0);
    setAudioError(false);
    setSelectedPartIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [surahNumber]);

  // If audio part changes, reload audio
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.load();
      if (wasPlaying) {
        setIsLoadingAudio(true);
        audioRef.current.play().catch(() => {
          setIsLoadingAudio(false);
          setAudioError(true);
        });
      }
    }
  }, [selectedPartIndex]);

  // If global video player is opened, stop audio playback
  useEffect(() => {
    if (player.isOpen && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoadingAudio(false);
    }
  }, [player.isOpen]);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoadingAudio(false);
    } else {
      // Pause video if user switches to audio
      if (player.isOpen) {
        player.closePlayer();
      }
      setAudioError(false);
      setIsLoadingAudio(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
          setAudioError(false);
        })
        .catch((e) => {
          console.warn("Audio playback issue:", e);
          setIsLoadingAudio(false);
          setAudioError(true);
        });
    }
  };

  const retryAudio = () => {
    setIsRetryingAudio(true);
    setIsLoadingAudio(true);
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
          setIsRetryingAudio(false);
        })
        .catch(() => {
          setAudioError(true);
          setIsLoadingAudio(false);
          setIsRetryingAudio(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setAudioError(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipSeconds = (sec: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + sec));
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleOpenVideo = (mode: "docked" | "floating") => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoadingAudio(false);
    }
    player.openPlayer(surahNumber, surahName, arabicName, mode);
  };

  // Check if docked player is currently active in tafsir reader
  const isDockedActive = player.isOpen && player.viewMode === "docked" && !player.isMinimized;

  return (
    <>
      {/* Hidden HTML5 Audio Element streaming from Archive.org high-quality MP3 */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoadingAudio(true)}
        onPlaying={() => {
          setIsLoadingAudio(false);
          setIsPlaying(true);
          setAudioError(false);
        }}
        onPause={() => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
        }}
        onError={() => {
          setIsLoadingAudio(false);
          setAudioError(true);
        }}
      />

      {/* =========================================================================
          MODE 1: TOP DOCKED SPLIT-SCREEN PLAYER (Apple Split-Screen Style)
          Sticky at top with a fixed 16:9 proportion as the user scrolls down,
          with tafsir commentary text flowing completely beneath it!
          ========================================================================= */}
      {isDockedActive && (
        <div className="sticky top-14 sm:top-16 z-30 w-full my-4 rounded-2xl border-2 border-accent/40 bg-card shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Docked Player Header Toolbar */}
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-card border-b border-border text-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">
                Dr. Israr Ahmed • Surah {player.surahName}
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-semibold">
                Split Screen (Top Fixed)
              </span>
            </div>

            {/* Header controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Float Window (pop out) */}
              <button
                onClick={() => player.setVideoMode("floating")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                title="Pop out into floating movable window (PiP)"
              >
                <Layers size={13} />
                <span className="hidden sm:inline">Float Window</span>
              </button>

              {/* Minimize to compact pill */}
              <button
                onClick={() => player.setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Minimize player"
              >
                <Minimize2 size={14} />
              </button>

              {/* External link */}
              <a
                href={media.youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Open in YouTube"
              >
                <ExternalLink size={14} />
              </a>

              {/* Close */}
              <button
                onClick={player.closePlayer}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Close Split Screen"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 16:9 Responsive Video Viewport */}
          <div className="relative w-full aspect-video max-h-[360px] sm:max-h-[420px] bg-black">
            <iframe
              src={media.youtubeEmbedUrl}
              title={`Dr. Israr Ahmed Bayan-ul-Quran Surah ${surahName}`}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          {/* Bottom helper info */}
          <div className="px-4 py-1.5 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">
              Scroll down freely to read the Tafsir text below • You can also open the Quran and keep watching!
            </span>
            <button
              onClick={() => player.setVideoMode("floating")}
              className="text-accent hover:underline font-semibold cursor-pointer shrink-0 ml-2"
            >
              Make Floating →
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN INLINE MEDIA CARD: ORIGINAL AUDIO TAFSIR + VIDEO LAUNCHER
          Always visible in the reader header, with Dr. Israr's portrait and MP3!
          ========================================================================= */}
      <div className="w-full my-4 rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur p-4 sm:p-5 transition-all">
        {/* Scholar Portrait + Lecture Details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5">
          {/* Portrait with Accent Halo */}
          <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl overflow-hidden border border-accent/30 bg-accent/5 p-1 shadow-inner flex items-center justify-center">
            <Image
              src="/images/dr-israr-ahmed.jpg"
              alt="Dr. Israr Ahmed"
              fill
              className="object-cover rounded-xl"
              sizes="(max-width: 640px) 64px, 80px"
              priority
              unoptimized
            />
            {isLoadingAudio && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-accent" />
              </div>
            )}
            {!isLoadingAudio && isPlaying && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                <span className="flex h-3.5 w-3.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent"></span>
                </span>
              </div>
            )}
          </div>

          {/* Info & Meta */}
          <div className="flex-1 flex flex-col justify-between text-center sm:text-left min-w-0">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent font-semibold text-[11px] uppercase tracking-wider">
                  <Sparkles size={11} className="text-accent" />
                  Original Audio Tafseer
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Urdu Bayan-ul-Quran (بیان القرآن)
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                Dr. Israr Ahmed • Surah {surahName} {arabicName && `(${arabicName})`}
              </h3>

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-0.5">
                <p className="text-xs text-muted-foreground">
                  Complete original Urdu lecture from Tanzeem-e-Islami archive.
                </p>

                {/* Multiple parts selector dropdown if Surah has multiple audio files */}
                {media.audioParts.length > 1 && (
                  <div className="relative inline-flex items-center">
                    <select
                      value={selectedPartIndex}
                      onChange={(e) => setSelectedPartIndex(Number(e.target.value))}
                      className="text-[11px] font-medium bg-muted/80 border border-border rounded-lg px-2 py-0.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {media.audioParts.map((part, idx) => (
                        <option key={part.filename} value={idx}>
                          {part.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="mt-3 flex flex-col gap-1.5 w-full">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground w-10 text-right shrink-0">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  aria-label="Audio progress"
                />
                <span className="text-[10px] font-mono text-muted-foreground w-10 text-left shrink-0">
                  {duration ? formatTime(duration) : "--:--"}
                </span>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                {/* Audio controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => skipSeconds(-15)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Rewind 15 seconds"
                  >
                    <Rewind size={15} />
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={isLoadingAudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs shadow-md hover:bg-accent/90 transition-all cursor-pointer disabled:opacity-85"
                    title={
                      isLoadingAudio
                        ? "Loading audio lecture stream..."
                        : isPlaying
                        ? "Pause Original Audio"
                        : "Play Original Audio"
                    }
                  >
                    {isLoadingAudio ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} className="fill-current" />
                    )}
                    <span>
                      {isLoadingAudio
                        ? "Loading..."
                        : isPlaying
                        ? "Pause"
                        : "Play Lecture"}
                    </span>
                  </button>

                  <button
                    onClick={() => skipSeconds(15)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Forward 15 seconds"
                  >
                    <FastForward size={15} />
                  </button>

                  <button
                    onClick={cycleSpeed}
                    className="px-2 py-1 rounded-lg border border-border text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors cursor-pointer"
                    title="Playback Speed"
                  >
                    {playbackRate}×
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                </div>

                {/* Video Split Screen / PiP Launch Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenVideo("docked")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-600/25 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Watch Split Screen Video (Apple Style)"
                  >
                    <Youtube size={14} className="text-red-500 fill-current" />
                    <span>Watch Video</span>
                  </button>

                  <button
                    onClick={() => handleOpenVideo("floating")}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center cursor-pointer"
                    title="Open Floating Picture-in-Picture window"
                  >
                    <Layers size={13} />
                  </button>

                  <a
                    href={media.youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                    title="Open Complete YouTube Playlist"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Audio error banner with retry */}
              {audioError && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 mt-2">
                  <span>Audio connection was interrupted or delayed by archive server.</span>
                  <button
                    onClick={retryAudio}
                    disabled={isRetryingAudio}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 font-semibold cursor-pointer shrink-0"
                  >
                    <RefreshCw size={11} className={isRetryingAudio ? "animate-spin" : ""} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
