"use client";

import React from "react";
import Image from "next/image";
import { Headphones, Play, ChevronRight } from "lucide-react";

interface ScholarSpotlightProps {
  onSelectScholar: (authorId: number, langName: string) => void;
}

export default function ScholarSpotlightBanner({ onSelectScholar }: ScholarSpotlightProps) {
  const scholars = [
    {
      id: 104, // Dr. Israr Ahmed
      name: "Dr. Israr Ahmed",
      series: "Bayan-ul-Quran (بیان القرآن)",
      langName: "Urdu",
      image: "/images/dr-israr-ahmed.jpg",
    },
    {
      id: 160, // Dr. Farhat Hashmi
      name: "Dr. Farhat Hashmi",
      series: "Taleem-ul-Quran (تعلیم القرآن)",
      langName: "Urdu",
      image: "/images/dr-farhat-hashmi.jpg",
    },
    {
      id: 170, // Ustadh Nouman Ali Khan
      name: "Nouman Ali Khan",
      series: "Quran Series & Divine Speech",
      langName: "English",
      image: "/images/nouman-ali-khan.jpg",
    },
  ];

  return (
    <div className="w-full mt-4 pt-5 border-t border-border/60">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Headphones className="size-3.5 text-accent" />
          <h3 className="text-xs font-semibold text-foreground tracking-wide">
            Audio & Video Scholar Series
          </h3>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • Original recorded tafsir lectures
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {scholars.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectScholar(s.id, s.langName)}
            className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-card/60 hover:bg-accent/5 hover:border-accent/40 transition-all text-left cursor-pointer"
          >
            <div className="relative size-10 rounded-lg overflow-hidden shrink-0 border border-border bg-muted/40">
              <Image
                src={s.image}
                alt={s.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="40px"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Play className="size-3 text-white fill-current opacity-85 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                  {s.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0 font-mono">
                  {s.langName}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {s.series}
              </p>
            </div>

            <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
