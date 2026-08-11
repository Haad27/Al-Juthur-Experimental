"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchAyahAudio } from "@/api/api";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import NavigatorButton from "@/components/NavigatorButton";
import { InteractiveAyahWords } from "@/components/quran/InteractiveAyahWords";
import AyahSkeleton from "@/components/quran/AyahSkeleton";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useAudioStore } from "@/lib/stores/audioStore";
import { cn, convertNumberToArabicNumeral, copyToClipboard } from "@/lib/utils";
import BismillahIcon from "@/components/svg/icons/BismillahIcon";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  Copy,
  Pause,
  Play,
  Save,
  ScrollText,
  BookOpen,
  Library,
  MessageSquareText,
  Bot,
  Loader2,
  SkipBack,
  SkipForward,
  Map,
  Compass,
  ChevronRight,
} from "lucide-react";
import SurahPlayer from "@/components/SurahPlayer";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
import FloatingAskScholarButton from "@/components/ai/FloatingAskScholarButton";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { amiri } from "@/app/fonts";
import useScrollDirection from "@/hooks/useScrollDirection";
import { KeyValue } from "@/components/ui/key-value";
import { ALL_TRANSLATION_OPTIONS } from "@/lib/translationsManifest";

interface AyahProps {
  number: number;
  numberInSurah: number;
  text: string;
  cleanText: string;
  translation: string;
  footnoteIds?: string[];
}

// How many ayahs to load per page from /api/ayahs
const PAGE_SIZE = 20;

/**
 * Estimates the rendered height of an ayah based on its Arabic word count.
 * This is used for the skeleton placeholder so Virtuoso already knows the
 * approximate height — preventing the scroll-position correction jump when
 * real content mounts and replaces the skeleton.
 */
function estimateAyahHeight(
  arabicText: string,
  showTranslation: boolean,
  isSidebarOpen: boolean
): number {
  const wordCount = Math.max(1, arabicText.trim().split(/\s+/).filter(Boolean).length);
  // Arabic script: ~5 words visible per line at default font size
  const arabicLines = Math.ceil(wordCount / 5);
  const arabicHeight = arabicLines * 58 + 36;
  // Translation: ~10 words per line, 28px each
  const translationHeight = showTranslation
    ? Math.ceil(wordCount / 10) * 28 + 60
    : 0;
  const actionsHeight = isSidebarOpen ? 60 : 80;
  return Math.max(190, arabicHeight + translationHeight + actionsHeight);
}

interface SurahReaderClientProps {
  surah: any;
  /** Only the first PAGE_SIZE ayahs — loaded server-side for fast initial paint */
  initialAyahs: AyahProps[];
  /** Total number of ayahs in this surah — used for Virtuoso totalCount */
  totalAyahs: number;
  /** All Arabic text strings for every ayah — lightweight, used for skeleton height estimation */
  allArabicTexts: string[];
  /** The translation edition that was used server-side for initialAyahs */
  initialEdition: string;
  surahWordsMap: Record<number, any[]>;
  juzParam: string | null;
  ayahParam: string | null;
  surahWbwTranslation?: Record<string, string>;
  surahInfo?: any;
}

interface AyahRowProps {
  ayah: AyahProps;
  surahNumber: number;
  surahWordsMap: Record<number, any[]>;
  fontSize: number;
  showTranslation: boolean;
  showWbw: boolean;
  surahWbwTranslation?: Record<string, string>;
  handleCopyAyah: (ayah: AyahProps) => void;
  handleSaveAyah: (ayah: AyahProps) => void;
  onOpenAiChat: (surahNumber: number, ayahNumber: number) => void;
  isUrduTranslation: boolean;
  translationEdition: string;
  isSidebarOpen?: boolean;
}

function cleanUrduFootnoteText(html: string) {
  if (!html) return "";
  
  // If the footnote contains both a Translation section and a Tafsir section, remove the Translation section
  // It usually looks like: <b class="text-emerald-400">ترجمہ (تفہیم القرآن):</b> ... <b class="text-amber-400">تفسیر:</b>
  const tafsirMarkerRegex = /<b[^>]*>تفسیر:<\/b>/i;
  const match = html.match(tafsirMarkerRegex);
  if (match && match.index !== undefined) {
    html = html.substring(match.index);
  } else {
    // fallback if no tags
    const fallbackTafsirRegex = /تفسیر:/i;
    const fbMatch = html.match(fallbackTafsirRegex);
    if (fbMatch && fbMatch.index !== undefined) {
      html = html.substring(fbMatch.index);
    }
  }

  // Sanitize and keep formatting HTML tags
  let clean = html;
  // Remove script/style tags
  clean = clean.replace(/<script\b[^<]*>(?:[\s\S]*?)<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*>(?:[\s\S]*?)<\/style>/gi, '');

  return clean;
}

function processTranslation(rawTranslation: string) {
  if (!rawTranslation) return { mainText: "", footnotes: [] };

  const footnotes: string[] = [];

  // Extract inline footnotes: <sup footnote-id="...">...</sup>
  let clean = rawTranslation.replace(
    /<sup\s+footnote-id="([^"]+)">([\s\S]*?)<\/sup>/gi,
    (_match, _id, content) => {
      const footnoteText = content.replace(/<[^>]*>?/gm, '').trim();
      if (footnoteText) {
        footnotes.push(footnoteText);
      }
      return ` <span class="text-emerald-400 font-semibold cursor-pointer text-xs">(${footnotes.length})</span>`;
    }
  );

  // Remove any remaining HTML tags except <b>, <i>, <span>, strong, <em>, <br>
  clean = clean.replace(/<(?!\/?(b|i|span|strong|em|br)\b)[^>]+>/gi, '');
  
  // Clean up any remaining double brackets like [[1]] or [[2]]
  clean = clean.replace(/\[\[.*?\]\]/g, '').replace(/\s{2,}/g, ' ').trim();

  // Deduplicate identical sentences (e.g. duplicate sentences appended by mistake)
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const uniqueSentences = sentences.filter((s, idx) => {
    const lower = s.trim().toLowerCase();
    return lower && sentences.findIndex((other) => other.trim().toLowerCase() === lower) === idx;
  });

  clean = uniqueSentences.join(" ");

  return { mainText: clean, footnotes };
}

const DesktopSurahHeader = ({ surah, translationEdition, aiChatContext, ALL_TRANSLATION_OPTIONS }: any) => {
  const show = useScrollDirection();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1280;
    }
    return true;
  });
  const isPlayingAudio = useAudioStore((s) => s.isPlaying);
  const [isAudioActive, setIsAudioActive] = useState(false);

  useEffect(() => {
    const checkAudio = () => {
      const isBodyNoScroll = typeof document !== "undefined" && document.body.classList.contains("no-scrollbar");
      setIsAudioActive(isPlayingAudio || isBodyNoScroll);
    };
    checkAudio();
    const interval = setInterval(checkAudio, 300);
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  useEffect(() => {
    const handleToggle = (e: any) => {
      if (e.detail && typeof e.detail.isCollapsed === "boolean") {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      }
    };
    window.addEventListener("left-sidebar-toggle", handleToggle);
    return () => window.removeEventListener("left-sidebar-toggle", handleToggle);
  }, []);

  const offsetLeftClass = isAudioActive ? "left-0" : (isSidebarCollapsed ? "left-16" : "left-[350px]");
  const widthClass = isAudioActive
    ? (aiChatContext ? "w-full lg:w-[calc(100%-420px)] xl:w-[calc(100%-450px)]" : "w-full")
    : (aiChatContext
        ? (isSidebarCollapsed ? "w-[calc(100%-64px)] lg:w-[calc(100%-64px-420px)] xl:w-[calc(100%-64px-450px)]" : "w-[calc(100%-350px)] lg:w-[calc(100%-350px-420px)] xl:w-[calc(100%-350px-450px)]")
        : (isSidebarCollapsed ? "w-[calc(100%-64px)]" : "w-[calc(100%-350px)]"));

  return (
    <div
      className={cn(
        "hidden md:flex fixed top-0 items-center justify-between md:min-h-14 px-6 py-3 backdrop-blur-3xl dark:bg-zinc-900/60 bg-white/80 border-b dark:border-zinc-800/60 border-black/10 shadow-md transition-all duration-300 ease-out z-50",
        show ? "translate-y-0" : "-translate-y-full",
        offsetLeftClass,
        widthClass
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 font-sans min-w-0">
          <span className="text-emerald-400 font-extrabold text-base md:text-lg tracking-tight truncate drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]">
            {surah?.englishName}
          </span>
          {surah?.englishNameTranslation && (
            <span className="text-zinc-400 text-xs truncate max-w-[200px]">
              ({surah?.englishNameTranslation})
            </span>
          )}
        </div>
        {surah?.revelationType && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase shrink-0">
            {surah.revelationType}
          </span>
        )}
      </div>
      <nav className="hidden lg:flex items-center gap-6 text-zinc-400 text-sm">
        <Link href="/home" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">Home</Link>
        <Link href="/tafsir" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">Tafsir</Link>
        <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">Lexicon</Link>
        <Link href="/ai" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">Translator</Link>
        <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">RAG Bot</Link>
      </nav>
    </div>
  );
};

const AyahRow = React.memo(({
  ayah,
  surahNumber,
  surahWordsMap,
  fontSize,
  showTranslation,
  showWbw,
  surahWbwTranslation,
  handleCopyAyah,
  handleSaveAyah,
  onOpenAiChat,
  isUrduTranslation,
  translationEdition,
  isSidebarOpen,
}: AyahRowProps) => {
  const isCurrentlyPlaying = useAudioStore(s => s.isPlaying && s.currentAyah === ayah.numberInSurah && s.currentSurah === surahNumber);
  const isPlaying = useAudioStore(s => s.isPlaying);
  const isOtherPlaying = isPlaying && !isCurrentlyPlaying;
  const playAyah = useAudioStore(s => s.playAyah);
  const pause = useAudioStore(s => s.pause);
  const [showFootnoteIds, setShowFootnoteIds] = useState(false);
  const [fetchedFootnotes, setFetchedFootnotes] = useState<Record<string, string>>({});
  const [loadingFootnotes, setLoadingFootnotes] = useState(false);
  const [pulseAi, setPulseAi] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("ayah_ai_seen")) {
      setPulseAi(true);
    }
  }, []);

  const isTafsirEdition = React.useMemo(() => {
    return ["158", "97", "234", "151", "84"].includes(translationEdition);
  }, [translationEdition]);

  const { mainText, footnotes } = React.useMemo(() => {
    return processTranslation(ayah.translation);
  }, [ayah.translation]);

  const hasFootnotesAvailable = React.useMemo(() => {
    return Boolean(ayah.footnoteIds?.length || footnotes.length > 0 || isTafsirEdition);
  }, [ayah.footnoteIds, footnotes, isTafsirEdition]);

  const handleToggleFootnotes = async () => {
    if (!showFootnoteIds) {
      setShowFootnoteIds(true);
      if (Object.keys(fetchedFootnotes).length === 0) {
        setLoadingFootnotes(true);
        const newFootnotes = { ...fetchedFootnotes };

        // 1. If it's a translation with Tafsir/Commentary (Dr. Israr, Maududi, Taqi Usmani)
        if (isTafsirEdition) {
          try {
            let authorId = "100158";
            if (translationEdition === "97" || translationEdition === "234") authorId = "138";
            if (translationEdition === "151" || translationEdition === "84") authorId = "139";
            if (translationEdition === "158") authorId = "158";

            const res = await fetch(`/api/tafsir?authorId=${authorId}&surahId=${surahNumber}&ayahId=${ayah.numberInSurah}`);
            if (res.ok) {
              const data = await res.json();
              if (data.data && data.data[0]?.text) {
                newFootnotes["tafsir_note"] = data.data[0].text;
              }
            }
          } catch(e) {
            console.error("Error fetching dynamic tafsir note:", e);
          }
        }

        // 2. Standard Quran.com API footnotes
        if (ayah.footnoteIds && ayah.footnoteIds.length > 0) {
          for (const fId of ayah.footnoteIds) {
            try {
              const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${fId}`);
              if (res.ok) {
                const data = await res.json();
                if (data.foot_note) {
                  newFootnotes[fId] = data.foot_note.text;
                }
              }
            } catch(e) {
              console.error(e);
            }
          }
        }

        setFetchedFootnotes(newFootnotes);
        setLoadingFootnotes(false);
      }
    } else {
      setShowFootnoteIds(false);
    }
  };

  const { mushafStyle } = useGlobalState();

  const mushafFontClass = React.useMemo(() => {
    switch (mushafStyle) {
      case "v1":              return "font-mushaf-v1";
      case "v2":              return "font-mushaf-v2";
      case "uthmani-simple":  return "font-mushaf-uthmani-simple";
      case "kfqpc":           return "font-mushaf-kfqpc";
      case "indopak":         return "font-mushaf-indopak";
      case "indopak-15":      return "font-mushaf-indopak-15";
      case "indopak-16":      return "font-mushaf-indopak-16";
      case "naskh":           return "font-mushaf-naskh";
      case "warsh":           return "font-mushaf-warsh";
      // Legacy compat
      case "uthmani":         return "font-mushaf-v2";
      case "amiri":           return "font-mushaf-warsh";
      default:                return "font-mushaf-v2";
    }
  }, [mushafStyle]);


  const handleFetchAudio = async () => {
    if (isCurrentlyPlaying) {
      pause();
      return;
    }
    const response = await fetchAyahAudio(surahNumber, ayah.numberInSurah);
    if (response?.data?.audio) {
      playAyah(surahNumber, ayah.numberInSurah, response.data.audio);
    }
  };

  const getArabicFontSize = (size: number): string => {
    if (size <= 0.5) return "1.1rem";
    if (size <= 1)   return "1.4rem";
    if (size <= 1.5) return "1.6rem";
    if (size <= 2)   return "1.8rem";
    if (size <= 2.5) return "2.0rem";
    if (size <= 3)   return "2.2rem";
    if (size <= 3.5) return "2.4rem";
    if (size <= 4)   return "2.6rem";
    if (size <= 4.5) return "2.85rem";
    if (size <= 5)   return "3.1rem";
    if (size <= 5.5) return "3.35rem";
    if (size <= 6)   return "3.6rem";
    if (size <= 6.5) return "3.9rem";
    if (size <= 7)   return "4.2rem";
    if (size <= 7.5) return "4.5rem";
    return "4.8rem";
  };

  const getTranslationFontSize = (size: number, isUrdu: boolean): string => {
    if (isUrdu) {
      if (size <= 0.5) return "0.95rem";
      if (size <= 1)   return "1.05rem";
      if (size <= 1.5) return "1.1rem";
      if (size <= 2)   return "1.15rem";
      if (size <= 2.5) return "1.25rem";
      if (size <= 3)   return "1.35rem";
      if (size <= 3.5) return "1.45rem";
      if (size <= 4)   return "1.5rem";
      if (size <= 4.5) return "1.57rem";
      if (size <= 5)   return "1.65rem";
      if (size <= 5.5) return "1.75rem";
      if (size <= 6)   return "1.85rem";
      if (size <= 6.5) return "1.97rem";
      if (size <= 7)   return "2.1rem";
      if (size <= 7.5) return "2.25rem";
      return "2.4rem";
    }
    
    if (size <= 0.5) return "0.75rem";
    if (size <= 1)   return "0.85rem";
    if (size <= 1.5) return "0.9rem";
    if (size <= 2)   return "0.95rem";
    if (size <= 2.5) return "1.0rem";
    if (size <= 3)   return "1.05rem";
    if (size <= 3.5) return "1.12rem";
    if (size <= 4)   return "1.2rem";
    if (size <= 4.5) return "1.27rem";
    if (size <= 5)   return "1.35rem";
    if (size <= 5.5) return "1.45rem";
    if (size <= 6)   return "1.55rem";
    if (size <= 6.5) return "1.67rem";
    if (size <= 7)   return "1.8rem";
    if (size <= 7.5) return "1.95rem";
    return "2.1rem";
  };


  return (
    <div
      className={cn(
        "transition-all duration-300 relative flex flex-col rounded-2xl shadow-sm w-full min-w-0 overflow-hidden box-border",
        isSidebarOpen
          ? "my-1.5 sm:my-2 md:my-2 p-3 sm:p-4 md:p-4 lg:p-4"
          : "my-3 sm:my-5 p-3.5 sm:p-6 md:p-7",
        isCurrentlyPlaying
          ? "border border-emerald-500/60 bg-zinc-900/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-[0_4px_25px_rgba(16,185,129,0.15)] scale-[1.005] z-50 max-h-[80vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent"
          : "border border-emerald-500/25 hover:border-emerald-500/50 bg-zinc-900/40 dark:bg-zinc-900/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)]",
        isOtherPlaying ? "opacity-35 blur-[1px] scale-[0.995] pointer-events-none" : "opacity-100 blur-none scale-100"
      )}
      id={`ayah-${ayah.numberInSurah}`}
    >
      {isCurrentlyPlaying && (
        <div className="sticky top-0 z-50 flex justify-center w-full mb-4 sm:mb-8 mt-2 sm:mt-0 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-zinc-900/95 border border-emerald-500/30 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <div className="flex items-end gap-[2px] h-3">
              <span className="w-[2px] h-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-[2px] h-2/3 bg-emerald-400 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-[2px] h-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.3s' }}></span>
            </div>
            <span className="text-[9px] font-bold text-emerald-400 tracking-[0.15em] uppercase hidden sm:inline">Now Playing</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (ayah.numberInSurah > 1) {
                  window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah - 1 } }));
                }
              }} 
              className="p-1 hover:bg-zinc-800 rounded-full text-zinc-300 transition"
              title="Previous Ayah"
            >
              <SkipBack className="size-3.5" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('pausePlayerAudio'));
              }} 
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white shadow-md transition"
              title="Pause & Return to Default Mode"
            >
              <Pause className="size-3.5 fill-current" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah + 1 } }));
              }} 
              className="p-1 hover:bg-zinc-800 rounded-full text-zinc-300 transition"
              title="Next Ayah"
            >
              <SkipForward className="size-3.5" />
            </button>
          </div>
        </div>
        </div>
      )}
      <div className={cn("flex flex-col items-end justify-end sm:flex-row w-full py-0", isSidebarOpen ? "sm:gap-6 gap-3" : "sm:gap-12 gap-4")}>
      <div className="h-full flex flex-row sm:order-1 order-2 sm:flex-col gap-2 sm:justify-center items-center transition-all duration-300 relative z-10 shrink-0">
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
          {surahNumber}:{ayah.numberInSurah}
        </span>
        <div className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center">
          <Copy
            className="text-zinc-400"
            size={18}
            onClick={() => handleCopyAyah(ayah)}
          />
        </div>
        <div
          onClick={() => handleSaveAyah(ayah)}
          className="p-2 rounded-full dark:hover:bg-zinc-800 hover:bg-[var(--sephia-500)]/45 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Save Ayah"
        >
          <Save className="text-zinc-400" size={18} />
        </div>
        <div
          onClick={() => {
            if (isCurrentlyPlaying) {
              window.dispatchEvent(new CustomEvent('pausePlayerAudio'));
            } else {
              window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah, openFab: true } }));
            }
          }}
          className="p-2 rounded-full dark:hover:bg-zinc-800 hover:bg-[var(--sephia-500)]/45 transition-colors cursor-pointer inline-flex items-center justify-center"
          title={isCurrentlyPlaying ? "Pause Recitation" : `Play Recitation for Ayah ${ayah.numberInSurah}`}
        >
          {isCurrentlyPlaying ? (
            <Pause size={18} className="text-emerald-400" />
          ) : (
            <Play size={18} className="text-zinc-400 hover:text-emerald-400" />
          )}
        </div>
        <Link
          href={`/tafsir?surah=${surahNumber}&ayah=${ayah.numberInSurah}`}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Read Tafsir"
        >
          <ScrollText className="text-emerald-500 hover:text-emerald-400" size={18} />
        </Link>
        <Link
          href={`/lexicon?surah=${surahNumber}&ayah=${ayah.numberInSurah}`}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Read Lexicon"
        >
          <Library className="text-amber-500 hover:text-amber-400" size={18} />
        </Link>
      </div>

      <div className="text-right sm:order-2 order-1 flex flex-col w-full">
        <p
          lang="ar"
          id={`atext-${ayah.numberInSurah}`}
          className={cn(
            mushafFontClass,
            "tracking-wide font-light",
            isSidebarOpen 
              ? "leading-relaxed sm:pr-4 md:pr-6 lg:pr-8 md:pb-1" 
              : "leading-loose sm:pr-8 md:pr-16 lg:pr-26 md:pb-8"
          )}
          style={{ fontSize: getArabicFontSize(fontSize) }}
        >
          <span className="inline-flex items-center justify-center size-6 rounded-full text-xl mr-4">
            ({convertNumberToArabicNumeral(ayah.numberInSurah)})
          </span>
          <InteractiveAyahWords
            surahNumber={surahNumber}
            ayahNumber={ayah.numberInSurah}
            ayahText={ayah.text}
            ayahWords={surahWordsMap[ayah.numberInSurah] || []}
            wbwTranslation={surahWbwTranslation}
            showWbw={showWbw}
          />
        </p>

        {showTranslation && (
          <div className={cn(
            "text-left w-full",
            isSidebarOpen ? "pt-2 md:pt-2" : "pt-4",
            isUrduTranslation 
              ? (isSidebarOpen ? "w-full sm:pr-4 md:pr-6" : "w-full sm:pr-8 md:pr-16 lg:pr-26")
              : (isSidebarOpen ? "w-full md:pr-4 lg:pr-8" : "md:ml-8 lg:w-2/3 md:w-4/6")
          )}>
            <div>
              <span
                className="text-white md:leading-[1.5] leading-[1.8] translation-content"
                style={{ 
                  fontSize: getTranslationFontSize(fontSize, isUrduTranslation),
                  fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                  lineHeight: isUrduTranslation ? "2.6" : undefined,
                  textAlign: isUrduTranslation ? "right" : undefined,
                  direction: isUrduTranslation ? "rtl" : undefined,
                  display: "block",
                  width: "100%"
                }}
                dangerouslySetInnerHTML={{ __html: mainText }}
              />
            </div>

            {(hasFootnotesAvailable && showFootnoteIds) ? (
              <div className="mt-3 p-4 rounded-xl bg-zinc-950/90 border border-emerald-500/30 text-sm text-zinc-100 max-h-80 overflow-y-auto custom-scrollbar relative shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] sticky -top-4 -mx-4 px-4 py-2.5 bg-zinc-950/95 backdrop-blur-md z-10 mb-3 border-b border-emerald-500/20 shadow-sm flex items-center justify-between">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                    FOOTNOTES & COMMENTARY NOTES
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {isTafsirEdition ? "EXPLANATIONS" : "FOOTNOTES"}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {loadingFootnotes ? (
                    <p className="text-emerald-400/80 animate-pulse text-xs py-2">Loading notes...</p>
                  ) : (
                    <>
                      {/* Dynamic Tafsir / Explanation Note for Dr. Israr, Maududi, Taqi Usmani */}
                      {fetchedFootnotes["tafsir_note"] && (
                        <div 
                          className="leading-[2.8] text-zinc-100 text-right p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 font-nastaliq"
                          dir={isUrduTranslation ? "rtl" : "auto"}
                          style={{ 
                            fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                            lineHeight: isUrduTranslation ? "2.8" : undefined,
                            fontSize: isUrduTranslation ? "1.15rem" : undefined,
                            color: "#f4f4f5"
                          }}
                          dangerouslySetInnerHTML={{ __html: cleanUrduFootnoteText(fetchedFootnotes["tafsir_note"]) }}
                        />
                      )}

                      {/* Inline/extracted footnotes */}
                      {footnotes.length > 0 && footnotes.map((fn, fIdx) => (
                        <div key={`inline-${fIdx}`} className="leading-relaxed text-zinc-200 p-2.5 rounded bg-zinc-900/60 border border-zinc-800" dir="auto">
                          {fn}
                        </div>
                      ))}

                      {/* API fetched footnotes */}
                      {ayah.footnoteIds && ayah.footnoteIds.length > 0 && (
                        ayah.footnoteIds.map((fId, idx) => (
                          <div 
                            key={fId} 
                            className="leading-relaxed p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-zinc-100" 
                            dir={isUrduTranslation ? "rtl" : "auto"}
                            style={{ 
                              fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                              lineHeight: isUrduTranslation ? "2.6" : undefined,
                              fontSize: isUrduTranslation ? "1.1rem" : undefined,
                              color: "#f4f4f5"
                            }}
                          >
                            <span className="text-emerald-400 font-bold mx-2 inline-block" dir="ltr">[{idx + 1}]</span>
                            <span dangerouslySetInnerHTML={{ __html: fetchedFootnotes[fId] || "Footnote unavailable." }} />
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {/* Actions: AI Chat & Footnotes */}
            <div className="mt-4 mb-1 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  setPulseAi(false);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("ayah_ai_seen", "true");
                  }
                  onOpenAiChat(surahNumber, ayah.numberInSurah);
                }}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/60 hover:bg-emerald-950/40 border border-emerald-500/35 hover:border-emerald-400/80 opacity-75 hover:opacity-100 transition-all cursor-pointer shadow-sm"
              >
                <Bot size={14} className="text-emerald-400 group-hover:text-emerald-300 transition-colors animate-bounce" />
                <span className="text-[11px] font-semibold tracking-wide text-emerald-300 group-hover:text-white transition-colors">
                  Ask Tafsir Scholar
                </span>
              </button>

              {hasFootnotesAvailable && (
                <button
                  onClick={handleToggleFootnotes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/60 hover:bg-emerald-950/40 border border-emerald-500/35 hover:border-emerald-400/80 opacity-75 hover:opacity-100 transition-all cursor-pointer group shadow-sm"
                  title={showFootnoteIds ? "Hide Footnotes" : "Show Footnotes & Commentary"}
                >
                  <MessageSquareText size={14} className="text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                  <span className="text-[11px] font-semibold tracking-wide text-emerald-300 group-hover:text-white transition-colors">
                    {showFootnoteIds ? "Hide Notes" : "Footnotes"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
});

export default function SurahReaderClient({
  surah,
  initialAyahs,
  totalAyahs,
  allArabicTexts,
  initialEdition,
  surahWordsMap,
  juzParam,
  ayahParam,
  surahWbwTranslation,
  surahInfo,
}: SurahReaderClientProps) {
  const { fontSize, showTranslation, showWbw, translationEdition } = useGlobalState();
  const [showSurahContext, setShowSurahContext] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const router = useRouter();
  const [visibleAyahNumber, setVisibleAyahNumber] = useState<number>(1);
  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);

  // ─── Paginated loading state ─────────────────────────────────────────────────
  // Keyed by 0-based index. Starts pre-populated with the server-rendered first page.
  const [loadedAyahs, setLoadedAyahs] = useState<Record<number, AyahProps>>(() => {
    const map: Record<number, AyahProps> = {};
    initialAyahs.forEach((a, i) => { map[i] = a; });
    return map;
  });

  // Which page numbers are already loaded / currently in-flight (avoid duplicate fetches)
  const loadedPagesRef = useRef<Set<number>>(new Set([0]));
  const loadingPagesRef = useRef<Set<number>>(new Set());

  const surahNumber = surah?.number || 1;

  const fetchPage = useCallback(async (page: number, edition: string) => {
    if (loadedPagesRef.current.has(page) || loadingPagesRef.current.has(page)) return;
    loadingPagesRef.current.add(page);
    const start = page * PAGE_SIZE + 1; // 1-based
    try {
      const res = await fetch(
        `/api/ayahs?surah=${surahNumber}&start=${start}&count=${PAGE_SIZE}&edition=${encodeURIComponent(edition)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { ayahs: AyahProps[] } = await res.json();
      setLoadedAyahs(prev => {
        const next = { ...prev };
        data.ayahs.forEach((ayah, i) => { next[start - 1 + i] = ayah; });
        return next;
      });
      loadedPagesRef.current.add(page);
    } catch (e) {
      console.error("[SurahReader] Failed to fetch page", page, e);
    } finally {
      loadingPagesRef.current.delete(page);
    }
  }, [surahNumber]);

  // When the translation edition changes, wipe the loaded ayahs and refetch
  // from scratch. Skip on first mount (server data already matches initialEdition).
  const isFirstEditionMount = useRef(true);
  useEffect(() => {
    if (isFirstEditionMount.current) {
      isFirstEditionMount.current = false;
      return;
    }
    // Clear everything
    loadedPagesRef.current = new Set();
    loadingPagesRef.current = new Set();
    setLoadedAyahs({});
    // rangeChanged will fire and fetch the visible pages automatically
  }, [translationEdition]);
  // ─────────────────────────────────────────────────────────────────────────────

  // All clean texts for SurahPlayer (needed for audio segment tracking).
  // Derived from allArabicTexts so we don’t need all ayahs loaded.
  const allCleanTexts = useMemo(
    () => allArabicTexts.map(t => t.replace(/[\u064B-\u065F\u0670]/g, "")),
    [allArabicTexts]
  );


  const handleOpenAiChat = (surah: number, ayah?: number) => {
    const targetAyah = typeof ayah === "number" && ayah > 0 ? ayah : visibleAyahNumber;
    setAiChatContext({ surah, ayah: targetAyah });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("close-left-sidebar"));
    }
  };

  const isPlayingAudio = useAudioStore(s => s.isPlaying);

  // Disable user manual scrolling during recitation
  useEffect(() => {
    if (isPlayingAudio) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPlayingAudio]);

  // Auto-scroll listener for audio player
  useEffect(() => {
    const handleScroll = (e: any) => {
      const index = e.detail?.index;
      if (typeof index === 'number') {
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    };
    const handleJump = (e: any) => {
      const index = e.detail?.index;
      if (typeof index === 'number') {
        setIsNavigatingAyah(true);
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
          setTimeout(() => {
            const element = document.getElementById(`ayah-${index + 1}`);
            if (element) {
              const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
              element.classList.add(...c);
              setTimeout(() => element.classList.remove(...c), 2000);
            }
            setIsNavigatingAyah(false);
          }, 300);
        }, 100);
      }
    };
    window.addEventListener('scrollToAyah', handleScroll);
    window.addEventListener('jumpToAyah', handleJump);
    return () => {
      window.removeEventListener('scrollToAyah', handleScroll);
      window.removeEventListener('jumpToAyah', handleJump);
    }
  }, []);

  const [collapsed, setCollapsed] = useState(true);
  const [isNavigatingAyah, setIsNavigatingAyah] = useState(false);

  const isUrduTranslation = React.useMemo(() => {
    return ALL_TRANSLATION_OPTIONS.find(t => t.identifier === translationEdition)?.languageCode.toLowerCase() === 'urdu';
  }, [translationEdition]);

  // Clear audio state on unmount or surah change
  useEffect(() => {
    const clearAudio = useAudioStore.getState().clearAudio;
    return () => clearAudio();
  }, [surahNumber]);

  useEffect(() => {
    if (surah) {
      localStorage.setItem("recent", JSON.stringify(surah));
    }
  }, [surah]);

  // Scroll to the selected ayah (if provided via the "ayah" search param).
  // Pre-fetch the page containing the target ayah so it’s ready when we scroll.
  useEffect(() => {
    if (ayahParam && totalAyahs > 0) {
      const ayahIndex = Number(ayahParam) - 1; // 0-based
      if (ayahIndex >= 0 && ayahIndex < totalAyahs) {
        setIsNavigatingAyah(true);
        const targetPage = Math.floor(ayahIndex / PAGE_SIZE);
        // Ensure the target page is fetched
        fetchPage(targetPage, translationEdition).then(() => {
          setTimeout(() => {
            virtuosoRef.current?.scrollToIndex({ index: ayahIndex, align: 'center', behavior: 'smooth' });
            setTimeout(() => {
              const element = document.getElementById(`ayah-${ayahParam}`);
              if (element) {
                const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
                element.classList.add(...c);
                setTimeout(() => element.classList.remove(...c), 2000);
              }
              setIsNavigatingAyah(false);
            }, 300);
          }, 100);
        });
      } else {
        toast("Requested ayah was not found");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayahParam, totalAyahs]);


  const handleCopyAyah = React.useCallback(({ numberInSurah, text, translation }: AyahProps) => {
    copyToClipboard(
      `${text}\n\n"${translation}"\n\n— Surah ${surah?.englishName || surahNumber} (${surahNumber}:${numberInSurah})`,
      "Copied verse to clipboard!"
    );
  }, [surah, surahNumber]);

  const handleSaveAyah = React.useCallback((ayah: AyahProps) => {
    const saved = JSON.parse(localStorage.getItem("saved-ayahs") || "[]");
    const alreadySaved = saved.some((item: AyahProps) => item.number === ayah.number);

    if (alreadySaved) {
      toast(
        <div className="flex items-center gap-3">
          <p className="text-3xl">🧾</p>
          <div>
            <p className="font-semibold text-emerald-500">Already saved</p>
            <p className="text-sm text-black">
              This ayah is already in your saved list.
            </p>
          </div>
        </div>
      );
      return;
    }

    const updated = [...saved, { ...ayah, surahNumber }];
    localStorage.setItem("saved-ayahs", JSON.stringify(updated));

    toast(
      <div className="flex items-center gap-3">
        <Check size={36} />
        <div>
          <p className="font-semibold text-emerald-500">Saved Ayah</p>
        </div>
      </div>
    );
  }, [surahNumber]);

  return (
    <div className="flex w-full min-h-[100dvh] relative dark:bg-zinc-900 bg-[var(--sephia-primary)]">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isNavigatingAyah && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative flex flex-col items-center gap-6 bg-zinc-900/90 border border-emerald-500/30 p-10 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent animate-pulse" />
              <div className="relative z-10 flex items-center justify-center">
                <div className="absolute size-16 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <LogoIcon className="size-6 text-emerald-400 animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              </div>
              <div className="relative z-10 space-y-1.5 text-center mt-2">
                <p className="text-zinc-100 font-bold tracking-[0.2em] uppercase text-xs">Navigating</p>
                <p className="text-emerald-500/80 text-[10px] font-mono tracking-wider">LOCATING VERSE...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className={cn(
        "flex items-center flex-col dark:bg-zinc-900 bg-[var(--sephia-primary)] dark:text-white text-black relative pb-6 md:pb-6 transition-all duration-300",
        aiChatContext ? "w-full lg:w-[calc(100%-420px)] xl:w-[calc(100%-450px)]" : "w-full flex-1"
      )}>
        <DesktopSurahHeader 
          surah={surah} 
          translationEdition={translationEdition} 
          aiChatContext={aiChatContext} 
          ALL_TRANSLATION_OPTIONS={ALL_TRANSLATION_OPTIONS} 
        />

        <div className="flex items-center text-center w-full flex-col pt-16 md:pt-16 mb-1 md:mb-2 relative z-20">
          <BismillahIcon className="dark:text-white text-black lg:max-w-56 md:max-w-48 max-w-36 sm:max-w-44" />
          
          {surahInfo && (
            <div className="mt-1.5 mb-1 flex flex-col items-center w-full max-w-3xl">
              <button
                onClick={() => setShowSurahContext(!showSurahContext)}
                className="group relative inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all duration-300"
                title={showSurahContext ? "Hide Context" : "Read Surah Context and Theme"}
              >
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Compass size={14} className="text-emerald-400 group-hover:text-emerald-300 transition-colors relative z-10 animate-[spin_4s_linear_infinite]" />
                <span className="text-[11px] md:text-[12px] font-bold tracking-widest text-emerald-300 group-hover:text-white transition-colors uppercase relative z-10">
                  {showSurahContext ? "Close Context" : "Context & Theme"}
                </span>
              </button>

              {showSurahContext && (
                <div className="mt-4 p-5 sm:p-6 w-full rounded-2xl bg-zinc-950/95 border border-emerald-500/40 text-sm text-zinc-100 shadow-[0_10px_40px_rgba(16,185,129,0.15)] relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                  
                  <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] mb-5 border-b border-emerald-500/20 pb-3 flex items-center justify-between">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[12px] flex items-center gap-2">
                      <Map size={15} />
                      CONTEXT & THEME OF {surahInfo.surah_name?.toUpperCase() || surah?.englishName?.toUpperCase()}
                    </span>
                    <button onClick={() => setShowSurahContext(false)} className="hover:bg-zinc-800 p-1.5 rounded-full transition-colors text-zinc-400 hover:text-white">
                      <span className="sr-only">Close</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4 leading-relaxed text-zinc-300">
                    {surahInfo.bismillah_pre_ayah && (
                      <p className="text-xs text-emerald-400/90 italic font-mono bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 mb-3">
                        Note: Bismillah is included as part of this Surah.
                      </p>
                    )}
                    <div 
                      className="text-zinc-200 leading-relaxed max-w-none text-xs sm:text-sm [&>h2]:text-emerald-400 [&>h2]:font-bold [&>h2]:text-sm sm:[&>h2]:text-base [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h2:first-child]:mt-0 [&>h3]:text-emerald-300 [&>h3]:font-bold [&>h3]:text-xs sm:[&>h3]:text-sm [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2.5 [&>ol]:list-decimal [&>ol]:ml-5 [&>ol]:mb-2.5 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-2.5 [&>li]:mb-1 [&>a]:text-emerald-400 [&>a:hover]:underline [&>strong]:text-zinc-100"
                      dangerouslySetInnerHTML={{ __html: surahInfo.heading || surahInfo.text }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col w-full min-h-[100dvh] px-2 sm:px-4 md:px-6 lg:px-8">
          <Virtuoso
            ref={virtuosoRef}
            useWindowScroll
            totalCount={totalAyahs}
            rangeChanged={({ startIndex, endIndex }) => {
              // Update the visible ayah tracker
              if (typeof startIndex === "number" && startIndex >= 0) {
                setVisibleAyahNumber(startIndex + 1);
              }
              // Pre-fetch pages that overlap with the visible range + a buffer of 15 items
              const BUFFER = 15;
              const firstNeeded = Math.max(0, startIndex - BUFFER);
              const lastNeeded = Math.min(totalAyahs - 1, endIndex + BUFFER);
              const firstPage = Math.floor(firstNeeded / PAGE_SIZE);
              const lastPage = Math.floor(lastNeeded / PAGE_SIZE);
              for (let p = firstPage; p <= lastPage; p++) {
                fetchPage(p, translationEdition);
              }
            }}
            itemContent={(index) => {
              const ayah = loadedAyahs[index];
              if (!ayah) {
                // Show a height-matched skeleton so Virtuoso never needs to correct
                // the scroll position when real content arrives.
                const estimatedHeight = estimateAyahHeight(
                  allArabicTexts[index] || "",
                  showTranslation,
                  !!aiChatContext
                );
                return (
                  <AyahSkeleton
                    estimatedHeight={estimatedHeight}
                    isSidebarOpen={!!aiChatContext}
                  />
                );
              }
              return (
                <AyahRow
                  key={`${ayah.numberInSurah}-${translationEdition}`}
                  ayah={ayah}
                  surahNumber={surahNumber}
                  surahWordsMap={surahWordsMap}
                  fontSize={fontSize}
                  showTranslation={showTranslation}
                  showWbw={showWbw}
                  surahWbwTranslation={surahWbwTranslation}
                  handleCopyAyah={handleCopyAyah}
                  handleSaveAyah={handleSaveAyah}
                  onOpenAiChat={handleOpenAiChat}
                  isUrduTranslation={isUrduTranslation}
                  translationEdition={translationEdition}
                  isSidebarOpen={!!aiChatContext}
                />
              );
            }}
          />

          <div className="mb-32 md:mb-12 w-full flex justify-center items-center pb-12">
            <div className="flex gap-4 w-full max-w-md px-2 justify-center mt-8 sm:mt-10 pt-2">
              <NavigatorButton
                direction="Previous"
                surahNumber={surahNumber > 1 ? surahNumber - 1 : 1}
              />
              <NavigatorButton
                direction="Next"
                surahNumber={surahNumber < 114 ? surahNumber + 1 : 114}
              />
            </div>
          </div>
        </div>

      </section>

      <SurahPlayer
        surahNumber={surahNumber}
        ayahText={allCleanTexts}
        lastAyahNumber={surah?.numberOfAyahs || 0}
        router={router}
        aiChatContext={aiChatContext}
      />

      <AyahChatSidebar
        surahNumber={aiChatContext?.surah || surahNumber}
        ayahNumber={aiChatContext?.ayah || visibleAyahNumber}
        isOpen={!!aiChatContext}
        onClose={() => setAiChatContext(null)}
        initialModeId="default"
      />

    </div>
  );
}
