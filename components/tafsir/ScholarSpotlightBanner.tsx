"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Headphones, ChevronRight, Play, ChevronUp, ChevronDown } from "lucide-react";

interface ScholarSpotlightProps {
  onSelectScholar: (authorId: number, langName: string) => void;
}

export default function ScholarSpotlightBanner({ onSelectScholar }: ScholarSpotlightProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scholar_spotlight_collapsed");
      if (saved === "true") setIsCollapsed(true);
    } catch {
      // LocalStorage access fails in private/restricted modes
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("scholar_spotlight_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const scholars = [
    {
      id: 104, // Dr. Israr Ahmed
      name: "Dr. Israr Ahmed",
      subName: "ڈاکٹر اسرار احمد",
      series: "Bayan-ul-Quran (بیان القرآن)",
      image: "/images/dr-israr-ahmed.jpg",
      langName: "Urdu",
    },
    {
      id: 160, // Dr. Farhat Hashmi
      name: "Dr. Farhat Hashmi",
      subName: "ڈاکٹر فرحت ہاشمی",
      series: "Taleem-ul-Quran (تعلیم القرآن)",
      image: "/images/dr-farhat-hashmi.jpg",
      langName: "Urdu",
    },
    {
      id: 170, // Ustadh Nouman Ali Khan
      name: "Nouman Ali Khan",
      subName: "نعمان علی خان",
      series: "Quran Series & Divine Speech",
      image: "/images/nouman-ali-khan.jpg",
      langName: "English",
    },
  ];

  if (isCollapsed) {
    return (
      <div className="w-full my-2.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 flex items-center justify-between transition-colors hover:border-accent/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Headphones className="size-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground truncate">
            Scholar Lecture Series
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
            — Dr. Israr Ahmed, Dr. Farhat Hashmi, Nouman Ali Khan
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="text-xs text-accent hover:text-accent/80 font-medium inline-flex items-center gap-1 shrink-0 ml-2 cursor-pointer transition-colors"
        >
          <span>Show</span>
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full my-3 rounded-xl border border-border bg-card/50 transition-colors">
      {/* Header bar */}
      <div className="px-3.5 py-2 border-b border-border/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Headphones className="size-3.5" />
          </div>
          <div className="flex items-baseline gap-2 truncate">
            <h3 className="text-xs font-semibold text-foreground tracking-wide">
              Scholar Lecture Series
            </h3>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Original audio & video commentaries
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
            title="Minimize section"
            aria-label="Minimize scholar lectures section"
          >
            <span className="hidden sm:inline">Hide</span>
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Compact Scholar Cards */}
      <div className="p-2 sm:p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {scholars.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectScholar(s.id, s.langName)}
            className="group relative flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-accent/40 bg-background/50 hover:bg-accent/5 transition-all text-left w-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {/* Scholar Portrait */}
            <div className="relative size-10 shrink-0 rounded-lg overflow-hidden border border-border/70 bg-muted/30">
              <Image
                src={s.image}
                alt={s.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="40px"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                <Play className="size-3 text-white fill-current opacity-85 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Scholar Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                  {s.name}
                </span>
                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0">
                  {s.langName}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors truncate mt-0.5">
                {s.series}
              </div>
            </div>

            <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
