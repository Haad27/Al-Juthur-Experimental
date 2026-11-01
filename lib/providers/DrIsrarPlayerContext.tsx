"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export type DrIsrarPlayerMode = "docked" | "floating";

interface DrIsrarPlayerContextType {
  isOpen: boolean;
  viewMode: DrIsrarPlayerMode;
  isMinimized: boolean;
  surahNumber: number;
  surahName: string;
  arabicName?: string;
  pipPos: { x: number; y: number };
  setPipPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  openPlayer: (
    surahNumber: number,
    surahName: string,
    arabicName?: string,
    mode?: DrIsrarPlayerMode
  ) => void;
  closePlayer: () => void;
  toggleMode: () => void;
  setVideoMode: (mode: DrIsrarPlayerMode) => void;
  setIsMinimized: (minimized: boolean) => void;
}

const DrIsrarPlayerContext = createContext<DrIsrarPlayerContextType | undefined>(undefined);

export function DrIsrarPlayerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DrIsrarPlayerMode>("docked");
  const [isMinimized, setIsMinimized] = useState(false);
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
    mode: DrIsrarPlayerMode = "docked"
  ) => {
    setSurahNumber(num);
    setSurahName(name);
    setArabicName(arName);
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

  const setVideoMode = (mode: DrIsrarPlayerMode) => {
    setViewMode(mode);
  };

  return (
    <DrIsrarPlayerContext.Provider
      value={{
        isOpen,
        viewMode,
        isMinimized,
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
      }}
    >
      {children}
    </DrIsrarPlayerContext.Provider>
  );
}

export function useDrIsrarPlayer() {
  const context = useContext(DrIsrarPlayerContext);
  if (!context) {
    throw new Error("useDrIsrarPlayer must be used within a DrIsrarPlayerProvider");
  }
  return context;
}
