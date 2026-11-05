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
  Info,
} from "lucide-react";
import { getScholarMedia, getScholarType, ScholarId } from "@/lib/scholarMedia";
import { useDrIsrarPlayer } from "@/lib/providers/DrIsrarPlayerContext";

interface DrIsrarMediaCardProps {
  surahNumber: number;
  surahName: string;
  arabicName?: string;
  scholarId?: ScholarId;
}

export default function DrIsrarMediaCard({
  surahNumber,
  surahName,
  arabicName,
  scholarId = "israr",
}: DrIsrarMediaCardProps) {
  const media = getScholarMedia(scholarId, surahNumber, surahName, arabicName);
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

  // Reset state when surah or scholar changes
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
  }, [surahNumber, scholarId]);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 9999);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const retryAudioStream = () => {
    if (!audioRef.current) return;
    setIsRetryingAudio(true);
    setAudioError(false);
    setIsLoadingAudio(true);
    audioRef.current.load();
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsLoadingAudio(false);
        setIsRetryingAudio(false);
      })
      .catch(() => {
        setIsLoadingAudio(false);
        setIsRetryingAudio(false);
        setAudioError(true);
      });
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const hours = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Video Launcher
  const launchVideo = (mode: "docked" | "floating") => {
    // Pause audio if video starts
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsLoadingAudio(false);
    }
    player.openPlayer(surahNumber, surahName, arabicName, mode, scholarId);
  };

  // Check if docked player is currently active in tafsir reader
  const isDockedActive = player.isOpen && player.viewMode === "docked" && player.scholarId === scholarId;

  return (
    <div className="w-full">
      {/* Hidden HTML5 Audio Element for Ultra-crisp archive.org streaming */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setIsLoadingAudio(false);
            setAudioError(false);
          }
        }}
        onWaiting={() => setIsLoadingAudio(true)}
        onPlaying={() => {
          setIsLoadingAudio(false);
          setIsPlaying(true);
          setAudioError(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          // Auto advance to next part if available
          if (selectedPartIndex + 1 < media.audioParts.length) {
            setSelectedPartIndex((prev) => prev + 1);
          }
        }}
        onError={() => {
          setIsLoadingAudio(false);
          setIsPlaying(false);
          setAudioError(true);
        }}
      />

      {/* =========================================================================
          DOCKED VIDEO VIEWPORT (Split-screen Apple-style header dock)
          ========================================================================= */}
      {isDockedActive && (
        <div className="w-full mb-4 rounded-2xl border-2 border-accent/40 bg-card overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Docked Video Top Bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-muted/80 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                {media.scholarName} • {media.seriesTitle}
              </p>
              <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-medium">
                Surah {surahName}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Float to PiP */}
              <button
                onClick={() => player.setVideoMode("floating")}
                className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="Pop out to floating picture-in-picture"
              >
                <Layers size={14} className="text-accent" />
                <span className="hidden md:inline">Float Window</span>
              </button>

              {/* Minimize to pill */}
              <button
                onClick={() => player.setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Minimize video"
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
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                title="Close Video"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Video Iframe Viewport */}
          <div className="relative w-full aspect-video max-h-[360px] sm:max-h-[420px] bg-black">
            <iframe
              src={media.youtubeEmbedUrl}
              title={`${media.scholarName} ${media.seriesTitle} Surah ${surahName}`}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          {/* Docked Video Footer Info */}
          <div className="px-3 sm:px-4 py-2 bg-card/60 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
            <span className="truncate">
              Watching lecture alongside Quran Ayah commentary
            </span>
            <button
              onClick={() => player.setVideoMode("floating")}
              className="text-accent hover:underline font-semibold cursor-pointer shrink-0 ml-2"
            >
              Pop out PiP ↗
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN INLINE MEDIA CARD: ORIGINAL AUDIO TAFSIR + VIDEO LAUNCHER
          ========================================================================= */}
      <div className="w-full my-4 rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur p-4 sm:p-5 transition-all">
        {/* Scholar Portrait + Lecture Details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5">
          {/* Portrait with Accent Halo */}
          <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl overflow-hidden border border-accent/30 bg-accent/5 p-1 shadow-inner flex items-center justify-center">
            <Image
              src={media.portraitUrl}
              alt={media.scholarName}
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
                  Original Audio & Video Series
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {media.seriesTitle}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                {media.scholarName} • Surah {surahName} {arabicName && `(${arabicName})`}
              </h3>

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {media.scholarTitle} Authentic Archive • {media.audioParts.length} Lecture Part{media.audioParts.length > 1 ? "s" : ""} Available
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
                        ? "Buffering..."
                        : isPlaying
                        ? "Pause Audio"
                        : "Play Audio"}
                    </span>
                  </button>

                  <button
                    onClick={() => skipSeconds(15)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Forward 15 seconds"
                  >
                    <FastForward size={15} />
                  </button>

                  {/* Playback speed */}
                  <button
                    onClick={cycleSpeed}
                    className="px-2 py-1 rounded-lg hover:bg-muted text-[11px] font-mono font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Playback speed"
                  >
                    {playbackRate}x
                  </button>

                  {/* Mute */}
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                </div>

                {/* Video controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => launchVideo("docked")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer"
                    title="Watch Split Screen Video"
                  >
                    <Youtube size={14} className="text-red-500 fill-current" />
                    <span>Watch Video</span>
                  </button>

                  <button
                    onClick={() => launchVideo("floating")}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Pop out Floating PiP Video"
                  >
                    <Layers size={14} className="text-accent" />
                  </button>

                  <a
                    href={media.youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                    title="Open on YouTube"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Audio error banner with retry */}
              {audioError && (
                <div className="mt-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <span>Network stream interrupted. Click to retry connection.</span>
                  <button
                    onClick={retryAudioStream}
                    disabled={isRetryingAudio}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-semibold text-[11px] hover:opacity-90 transition cursor-pointer"
                  >
                    <RefreshCw size={11} className={isRetryingAudio ? "animate-spin" : ""} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informative Note for User */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info size={13} className="text-accent shrink-0" />
          <span>
            <strong>Audio & Video First:</strong> The primary rich scholarly exposition for {media.scholarName} is presented in the original lectures above. The text below serves as reference.
          </span>
        </div>
      </div>
    </div>
  );
}
