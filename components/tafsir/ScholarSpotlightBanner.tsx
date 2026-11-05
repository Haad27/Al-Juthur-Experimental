"use client";

import React from "react";
import Image from "next/image";
import { Headphones, Youtube, Sparkles, ChevronRight, Play } from "lucide-react";

interface ScholarSpotlightProps {
  onSelectScholar: (authorId: number, langName: string) => void;
}

export default function ScholarSpotlightBanner({ onSelectScholar }: ScholarSpotlightProps) {
  const scholars = [
    {
      id: 104, // Dr. Israr Ahmed
      name: "Dr. Israr Ahmed",
      urduName: "ڈاکٹر اسرار احمد",
      series: "Bayan-ul-Quran (بیان القرآن)",
      desc: "Complete 114 Surahs authentic audio & video lectures recorded by Tanzeem-e-Islami.",
      image: "/images/dr-israr-ahmed.jpg",
      badge: "Full Bayan-ul-Quran Series",
      langName: "Urdu",
    },
    {
      id: 160, // Dr. Farhat Hashmi
      name: "Dr. Farhat Hashmi",
      urduName: "ڈاکٹر فرحت ہاشمی",
      series: "Taleem-ul-Quran (تعلیم القرآن)",
      desc: "Word-by-word Urdu translation, deep contextual insights, and video lecture series.",
      image: "/images/dr-farhat-hashmi.jpg",
      badge: "Word-by-Word & Tafseer",
      langName: "Urdu",
    },
  ];

  return (
    <div className="w-full my-6 rounded-2xl sm:rounded-3xl border border-accent/30 bg-gradient-to-br from-card via-card to-accent/5 p-4 sm:p-6 shadow-md relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute -top-12 -right-12 size-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 size-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent">
            <Headphones className="size-4 sm:size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                Special Collection
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <Youtube className="size-3 text-red-500 fill-current" /> Video & Audio Lectures
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
              Original Scholar Lecture Series (آڈیو و ویڈیو دروس)
            </h2>
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-sm">
          Listen to genuine scholarly recordings with synchronized ayah commentaries and video lectures.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {scholars.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectScholar(s.id, s.langName)}
            className="group relative flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl border border-border/80 hover:border-accent/50 bg-background/70 hover:bg-muted/40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
          >
            {/* Scholar Portrait */}
            <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl overflow-hidden border border-accent/30 bg-accent/5 p-1 shadow-inner flex items-center justify-center">
              <Image
                src={s.image}
                alt={s.name}
                fill
                className="object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                sizes="80px"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              <div className="absolute bottom-1 right-1 p-1 rounded-full bg-accent text-accent-foreground shadow">
                <Play className="size-2.5 fill-current" />
              </div>
            </div>

            {/* Scholar Details */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent uppercase tracking-wider">
                  {s.badge}
                </span>
                <span className="text-[11px] text-muted-foreground font-arabic">
                  {s.urduName}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-accent transition-colors truncate">
                {s.name} • {s.series}
              </h3>

              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {s.desc}
              </p>

              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                <span>Open Audio & Video Tafsir</span>
                <ChevronRight className="size-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
