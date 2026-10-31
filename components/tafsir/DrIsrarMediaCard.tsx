"use client";

import React, { useState, useRef, useEffect } from "react";
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
  RotateCcw,
  FastForward,
  Rewind,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDrIsrarMedia } from "@/lib/bayanUlQuranMedia";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset state when surah changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [surahNumber]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(false);
        })
        .catch((e) => {
          console.warn("Audio play prevented or file not reachable:", e);
          setAudioError(true);
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

  const youtubeWatchUrl = media.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${media.youtubeVideoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(media.youtubeSearchQuery)}`;

  const youtubeEmbedUrl = media.youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${media.youtubeVideoId}?autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(media.youtubeSearchQuery)}&autoplay=1`;

  return (
    <div className="w-full my-4 rounded-2xl border border-border bg-card/90 shadow-sm backdrop-blur p-4 sm:p-5 transition-all">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={media.audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setAudioError(true)}
      />

      {/* Main Bar: Portrait + Info + Controls */}
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5">
        {/* Scholar Portrait with Gold Accent Halo */}
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
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Listen to the complete original Urdu lecture or watch the live video explanation.
            </p>
          </div>

          {/* Timeline & Audio Controls */}
          <div className="mt-3 flex flex-col gap-1.5 w-full">
            {/* Scrubber */}
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

            {/* Bottom Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              {/* Audio Playback Buttons */}
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

              {/* Video Watch Toggle Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-600/25 text-xs font-semibold transition-all cursor-pointer"
                  title="Watch Dr. Israr Video"
                >
                  <Youtube size={14} className="text-red-500 fill-current" />
                  <span>Watch Video</span>
                </button>

                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                  title="Open in YouTube"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {audioError && (
              <p className="text-[11px] text-amber-500/90 pt-1 text-center sm:text-left">
                Audio stream direct connection was interrupted. You can watch the lecture video
                directly using the red "Watch Video" button!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Inline / Modal YouTube Video Player */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60">
              <div className="flex items-center gap-2">
                <Tv size={16} className="text-accent" />
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Dr. Israr Ahmed • Bayan-ul-Quran (Surah {surahName})
                </span>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close Video"
              >
                <X size={16} />
              </button>
            </div>

            {/* 16:9 Video Embed */}
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={youtubeEmbedUrl}
                title={`Dr. Israr Ahmed Bayan-ul-Quran Surah ${surahName}`}
                className="absolute inset-0 size-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            {/* Footer with external link */}
            <div className="px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
              <span>Bayan-ul-Quran Lectures Collection</span>
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <span>Open on YouTube</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
