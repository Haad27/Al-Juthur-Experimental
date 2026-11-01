"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Youtube,
  Tv,
  X,
  ExternalLink,
  FastForward,
  Rewind,
  Sparkles,
  Move,
  Minimize2,
  Maximize2,
  PanelTop,
  Layers,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDrIsrarMedia, DrIsrarAudioPart } from "@/lib/bayanUlQuranMedia";

interface DrIsrarMediaCardProps {
  surahNumber: number;
  surahName: string;
  arabicName?: string;
}

type VideoViewMode = "docked" | "floating";

export default function DrIsrarMediaCard({
  surahNumber,
  surahName,
  arabicName,
}: DrIsrarMediaCardProps) {
  const media = getDrIsrarMedia(surahNumber, surahName);

  // Audio state
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isRetryingAudio, setIsRetryingAudio] = useState(false);

  // Video state (Split Screen Docked vs Floating PiP)
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoViewMode>("docked");
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);

  // Floating PiP Drag state
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 24,
    posY: 80,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active audio URL based on selected part
  const currentAudioUrl =
    media.audioParts.length > 0 && media.audioParts[selectedPartIndex]
      ? media.audioParts[selectedPartIndex].url
      : media.audioUrl;

  const currentPartLabel =
    media.audioParts.length > 0 && media.audioParts[selectedPartIndex]
      ? media.audioParts[selectedPartIndex].label
      : "Full Lecture";

  // Reset state when surah changes
  useEffect(() => {
    setIsPlaying(false);
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
        audioRef.current.play().catch(() => setAudioError(true));
      }
    }
  }, [selectedPartIndex]);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Pause video if user switches to audio
      if (isVideoOpen) {
        setIsVideoOpen(false);
      }
      setAudioError(false);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(false);
        })
        .catch((e) => {
          console.warn("Audio playback issue:", e);
          setAudioError(true);
        });
    }
  };

  const retryAudio = () => {
    setIsRetryingAudio(true);
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsRetryingAudio(false);
        })
        .catch(() => {
          setAudioError(true);
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

  // Video toggles
  const openVideo = (mode: VideoViewMode = "docked") => {
    // Pause audio when video opens
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setVideoMode(mode);
    setIsVideoMinimized(false);
    setIsVideoOpen(true);
  };

  const closeVideo = () => {
    setIsVideoOpen(false);
    setIsVideoMinimized(false);
  };

  // Draggable PiP Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header handle
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: pipPos.x,
      posY: pipPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    // Bounds check
    const maxX = Math.max(20, window.innerWidth - 380);
    const maxY = Math.max(20, window.innerHeight - 250);

    const nextX = Math.min(Math.max(10, dragStartRef.current.posX + dx), maxX);
    const nextY = Math.min(Math.max(10, dragStartRef.current.posY + dy), maxY);

    setPipPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <>
      {/* Hidden HTML5 Audio Element streaming from Archive.org high-quality MP3 */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setAudioError(true)}
      />

      {/* =========================================================================
          MODE 1: TOP DOCKED SPLIT-SCREEN PLAYER (Apple Split-Screen Style)
          Takes the top area, pinned cleanly, and text flows completely beneath it!
          ========================================================================= */}
      {isVideoOpen && videoMode === "docked" && (
        <div className="w-full my-4 rounded-2xl border-2 border-accent/40 bg-card shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Docked Player Header Toolbar */}
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-card border-b border-border text-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">
                Dr. Israr Ahmed • Bayan-ul-Quran (Surah {surahName})
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-semibold">
                Split Screen (Top Area)
              </span>
            </div>

            {/* Apple-style window action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Switch to Floating PiP mode */}
              <button
                onClick={() => setVideoMode("floating")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                title="Pop out into floating movable window (PiP)"
              >
                <Layers size={13} />
                <span className="hidden sm:inline">Float Window</span>
              </button>

              {/* Minimize to compact pill */}
              <button
                onClick={() => setIsVideoMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Minimize player"
              >
                <Minimize2 size={14} />
              </button>

              {/* Open in YouTube */}
              <a
                href={media.youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Open in YouTube"
              >
                <ExternalLink size={14} />
              </a>

              {/* Close Video */}
              <button
                onClick={closeVideo}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Close Split Screen"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 16:9 Responsive Video Viewport */}
          <div className="relative w-full aspect-video max-h-[380px] sm:max-h-[460px] bg-black">
            <iframe
              src={media.youtubeEmbedUrl}
              title={`Dr. Israr Ahmed Bayan-ul-Quran Surah ${surahName}`}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          {/* Sub-bar with quick hint */}
          <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              💡 Split screen active: Scroll down freely to read the Tafsir commentary text below
              without interruption.
            </span>
            <button
              onClick={() => setVideoMode("floating")}
              className="text-accent hover:underline font-semibold cursor-pointer shrink-0 ml-2"
            >
              Make Floating →
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 2: MOVABLE FLOATING PICTURE-IN-PICTURE (Apple PiP Style)
          Hovering on top, always on top (z-70), solid background so text below
          never bleeds through, and fully draggable across the screen!
          ========================================================================= */}
      {isVideoOpen && videoMode === "floating" && !isVideoMinimized && (
        <div
          style={{
            position: "fixed",
            left: `${pipPos.x}px`,
            top: `${pipPos.y}px`,
            zIndex: 70,
          }}
          className={cn(
            "w-[90vw] sm:w-[440px] md:w-[480px] rounded-2xl border-2 border-accent/50 bg-card shadow-2xl overflow-hidden transition-shadow select-none",
            isDragging ? "shadow-accent/20 cursor-grabbing ring-2 ring-accent" : "shadow-2xl"
          )}
        >
          {/* Floating Drag Handle Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b border-border cursor-grab active:cursor-grabbing text-foreground"
            title="Drag to move video window"
          >
            <div className="flex items-center gap-2 min-w-0 pointer-events-none">
              <Move size={14} className="text-accent shrink-0" />
              <span className="text-xs font-bold truncate">
                Dr. Israr • Surah {surahName}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Dock back to Top Split Screen */}
              <button
                onClick={() => setVideoMode("docked")}
                className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Dock to top split-screen"
              >
                <PanelTop size={14} />
              </button>

              {/* Minimize to Pill */}
              <button
                onClick={() => setIsVideoMinimized(true)}
                className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Minimize"
              >
                <Minimize2 size={14} />
              </button>

              {/* Close */}
              <button
                onClick={closeVideo}
                className="p-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Video Container (16:9, Solid Black Base, High z-index) */}
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={media.youtubeEmbedUrl}
              title={`Dr. Israr Ahmed Bayan-ul-Quran Surah ${surahName}`}
              className="absolute inset-0 size-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          {/* Floating Footer with controls */}
          <div className="px-3 py-1.5 bg-card flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">Drag header to reposition</span>
            <button
              onClick={() => setVideoMode("docked")}
              className="text-accent hover:underline font-semibold cursor-pointer shrink-0"
            >
              Dock to Top ↑
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 3: MINIMIZED FLOATING PILL
          When the user minimizes either docked or floating video to view full text
          ========================================================================= */}
      {isVideoOpen && isVideoMinimized && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-card border border-accent/40 shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="text-xs font-bold">Dr. Israr Bayan ({surahName})</span>
          <button
            onClick={() => setIsVideoMinimized(false)}
            className="p-1 rounded-full hover:bg-muted text-accent hover:text-accent-foreground transition-colors cursor-pointer"
            title="Expand Video"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={closeVideo}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close Video"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN INLINE MEDIA CARD: ORIGINAL AUDIO TAFSIR + VIDEO LAUNCHER
          Always visible in the reader header, with Dr. Israr's verified MP3 stream!
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
            />
            {isPlaying && (
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs shadow-md hover:bg-accent/90 transition-all cursor-pointer"
                    title={isPlaying ? "Pause Original Audio" : "Play Original Audio"}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
                    <span>{isPlaying ? "Pause" : "Play Lecture"}</span>
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
                    onClick={() => openVideo("docked")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-600/25 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Watch Split Screen Video (Apple Style)"
                  >
                    <Youtube size={14} className="text-red-500 fill-current" />
                    <span>Watch Video</span>
                  </button>

                  <button
                    onClick={() => openVideo("floating")}
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
                    title="Open in YouTube"
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
