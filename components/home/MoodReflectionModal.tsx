"use client";

import React from "react";
import { X, BookOpen, ArrowRight, Sparkles, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { MoodReflection } from "@/lib/homeData";
import { amiri, amiriquran, inter } from "@/app/fonts";

interface MoodReflectionModalProps {
  mood: MoodReflection | null;
  onClose: () => void;
}

export default function MoodReflectionModal({ mood, onClose }: MoodReflectionModalProps) {
  const router = useRouter();

  if (!mood) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/25">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{mood.title}</h3>
                <span className={`${amiri.className} text-sm text-arabic`}>
                  {mood.arabicTitle}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{mood.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close reflection"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Featured Ayah Card */}
          <div className="rounded-xl border border-border bg-background/60 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-accent">
                Surah {mood.quote.surahName} · Ayah {mood.quote.ayahNumber}
              </span>
              <span>[Reference {mood.quote.surahNumber}:{mood.quote.ayahNumber}]</span>
            </div>

            {/* Arabic Verse */}
            <p
              className={`${amiriquran.className} text-xl sm:text-2xl text-arabic leading-loose text-right`}
              dir="rtl"
            >
              {mood.quote.arabicText}
            </p>

            {/* Translation */}
            <p className="text-sm sm:text-base italic text-reading leading-relaxed">
              "{mood.quote.translation}"
            </p>
          </div>

          {/* Classical Tafsir Insight */}
          <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              <BookOpen className="size-3.5" />
              <span>Classical Tafsir Insight</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {mood.quote.tafsirExcerpt}
            </p>
            <p className="text-xs text-muted-foreground text-right pt-1 font-medium">
              — {mood.quote.tafsirSource}
            </p>
          </div>

          {/* Recommended Surahs for this Mood */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recommended Surahs to Recite & Study
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {mood.recommendedSurahs.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => {
                    onClose();
                    router.push(`/surah/${surah.number}`);
                  }}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 text-left hover:border-accent/50 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-foreground group-hover:text-accent transition">
                      {surah.number}. {surah.englishName}
                    </span>
                    <span className={`${amiriquran.className} text-sm text-arabic`}>
                      {surah.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {surah.reason}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5 bg-muted/20">
          <button
            onClick={() => {
              onClose();
              router.push(`/tafsir?surah=${mood.quote.surahNumber}&ayah=${mood.quote.ayahNumber}`);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            <span>Open in 120+ Tafsir Explorer</span>
            <ArrowRight className="size-3.5" />
          </button>

          <button
            onClick={() => {
              onClose();
              router.push(`/surah/${mood.quote.surahNumber}?ayah=${mood.quote.ayahNumber}`);
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition cursor-pointer"
          >
            Read Ayah in Quran
          </button>
        </div>
      </div>
    </div>
  );
}
