"use client";

import React from "react";
import Image from "next/image";
import { Headphones } from "lucide-react";

interface ScholarSpotlightProps {
  onSelectScholar: (authorId: number, langName: string) => void;
}

export default function ScholarSpotlightBanner({ onSelectScholar }: ScholarSpotlightProps) {
  const scholars = [
    {
      id: 104, // Dr. Israr Ahmed
      name: "Dr. Israr Ahmed",
      seriesShort: "بیان القرآن",
      langName: "Urdu",
      image: "/images/dr-israr-ahmed.jpg",
    },
    {
      id: 160, // Dr. Farhat Hashmi
      name: "Dr. Farhat Hashmi",
      seriesShort: "تعلیم القرآن",
      langName: "Urdu",
      image: "/images/dr-farhat-hashmi.jpg",
    },
    {
      id: 170, // Ustadh Nouman Ali Khan
      name: "Nouman Ali Khan",
      seriesShort: "Divine Speech",
      langName: "English",
      image: "/images/nouman-ali-khan.jpg",
    },
  ];

  return (
    <div className="w-full py-1">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full select-none py-1">
        <span className="text-xs font-semibold text-muted-foreground pr-1 whitespace-nowrap flex items-center gap-1.5 shrink-0 pointer-events-none">
          <Headphones className="size-3.5 text-accent" /> Audio & Video:
        </span>
        {scholars.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectScholar(s.id, s.langName)}
            className="group inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 bg-card/70 border border-border hover:border-accent/40 hover:bg-accent/5 text-muted-foreground hover:text-foreground cursor-pointer shadow-xs"
          >
            <div className="relative size-4 rounded-full overflow-hidden shrink-0 border border-border/80">
              <Image
                src={s.image}
                alt={s.name}
                fill
                className="object-cover"
                sizes="16px"
                unoptimized
              />
            </div>
            <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
              {s.name}
            </span>
            <span className="text-[11px] text-muted-foreground/80 font-arabic group-hover:text-foreground/90 transition-colors">
              ({s.seriesShort})
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono">
              {s.langName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
