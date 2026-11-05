"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export type ScholarPlayerMode = "docked" | "floating";
export type ScholarId = "israr" | "farhat" | "nouman";

// Backwards-compatible type alias
export type DrIsrarPlayerMode = ScholarPlayerMode;

interface ScholarPlayerContextType {
  isOpen: boolean;
  viewMode: ScholarPlayerMode;
  isMinimized: boolean;
  scholarId: ScholarId;
  surahNumber: number;
  surahName: string;
  arabicName?: string;
  pipPos: { x: number; y: number };
  setPipPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  openPlayer: (
    surahNumber: number,
    surahName: string,
    arabicName?: string,
    mode?: ScholarPlayerMode,
    scholar?: ScholarId
  ) => void;
  closePlayer: () => void;
  toggleMode: () => void;
  setVideoMode: (mode: ScholarPlayerMode) => void;
  setIsMinimized: (minimized: boolean) => void;
  setScholar: (scholar: ScholarId) => void;
}

const ScholarPlayerContext = createContext<ScholarPlayerContextType | undefined>(undefined);

export function DrIsrarPlayerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ScholarPlayerMode>("docked");
  const [isMinimized, setIsMinimized] = useState(false);
  const [scholarId, setScholarId] = useState<ScholarId>("israr");
  const [surahNumber, setSurahNumber] = useState(1);
  const [surahName, setSurahName] = useState("Al-Fatihah");
  const [arabicName, setArabicName] = useState<string | undefined>("الفاتحة");
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });

  // If user navigates away from /tafsir while docked video is playing,
  // automatically transition to floating PiP so video continues uninterrupted!
  useEffect(() => {
    if (isOpen && pathname !== "/tafsir" && viewMode === "docked") {
      setViewMode("floating");
    }
  }, [pathname, isOpen, viewMode]);

  const openPlayer = (
    num: number,
    name: string,
    arName?: string,
    mode: ScholarPlayerMode = "docked",
    scholar: ScholarId = "israr"
  ) => {
    setSurahNumber(num);
    setSurahName(name);
    setArabicName(arName);
    setScholarId(scholar);
    // If not on /tafsir, always open as floating PiP
    if (pathname !== "/tafsir") {
      setViewMode("floating");
    } else {
      setViewMode(mode);
    }
    setIsMinimized(false);
    setIsOpen(true);
  };

  const closePlayer = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggleMode = () => {
    setViewMode((prev) => (prev === "docked" ? "floating" : "docked"));
  };

  const setVideoMode = (mode: ScholarPlayerMode) => {
    setViewMode(mode);
  };

  const setScholar = (scholar: ScholarId) => {
    setScholarId(scholar);
  };

  return (
    <ScholarPlayerContext.Provider
      value={{
        isOpen,
        viewMode,
        isMinimized,
        scholarId,
        surahNumber,
        surahName,
        arabicName,
        pipPos,
        setPipPos,
        openPlayer,
        closePlayer,
        toggleMode,
        setVideoMode,
        setIsMinimized,
        setScholar,
      }}
    >
      {children}
    </ScholarPlayerContext.Provider>
  );
}

export function useDrIsrarPlayer() {
  const context = useContext(ScholarPlayerContext);
  if (!context) {
    throw new Error("useDrIsrarPlayer must be used within a DrIsrarPlayerProvider");
  }
  return context;
}

// Re-export alias
export const useScholarPlayer = useDrIsrarPlayer;
