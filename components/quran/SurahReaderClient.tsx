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
  Library,
  MessageSquareText,
  Bot,
  Loader2,
  SkipBack,
  SkipForward,
  Map as MapIcon,
  Compass,
  ChevronRight,
} from "lucide-react";
import SurahPlayer from "@/components/SurahPlayer";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
import TafsirWheelPickerModal from "@/components/quran/TafsirWheelPickerModal";
import TopicSearchModal from "@/components/shared/TopicSearchModal";
import FloatingAskScholarButton from "@/components/ai/FloatingAskScholarButton";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { amiri } from "@/app/fonts";
import useScrollDirection from "@/hooks/useScrollDirection";
import { KeyValue } from "@/components/ui/key-value";
import { ALL_TRANSLATION_OPTIONS } from "@/lib/translationsManifest";
import { getTranslationFontStyle } from "@/lib/fontsConfig";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import AlJuthurLoadingProgress from "@/components/shared/AlJuthurLoadingProgress";
import AyahSkeleton from "@/components/quran/AyahSkeleton";
import { setRecentQuranReading } from "@/lib/readerStorage";

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
  onOpenTafsirPicker: (surahNumber: number, ayahNumber: number) => void;
  isUrduTranslation: boolean;
  translationEdition: string;
  isSidebarOpen?: boolean;
}

function cleanUrduFootnoteText(html: string) {
  if (!html) return "";
  
  // If the footnote explicitly contains the Tafheem Translation section header, strip that header to leave the Tafsir section
  if (html.includes("ترجمہ (تفہیم القرآن)")) {
    const tafsirMarkerRegex = /<b[^>]*>تفسیر:<\/b>/i;
    const match = html.match(tafsirMarkerRegex);
    if (match && match.index !== undefined) {
      html = html.substring(match.index);
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

  // Extract inline footnotes: <sup ...>...</sup> or <a ...>...</a>
  let clean = rawTranslation.replace(
    /<(?:sup|a|span)\b[^>]*(?:foot_note|footnote_id|footnote-id|footnote|data-footnote|data-foot_note)=["']?([^"'>\s]+)["']?[^>]*>([\s\S]*?)<\/(?:sup|a|span)>/gi,
    (_match, _id, content) => {
      const footnoteText = content.replace(/<[^>]*>?/gm, '').trim();
      if (footnoteText && !/^\d+$/.test(footnoteText)) {
        footnotes.push(footnoteText);
      }
      return ` <span class="text-accent font-semibold cursor-pointer text-xs footnote-indicator">(${footnotes.length || content})</span>`;
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

const DesktopSurahHeader = ({ surah, translationEdition, aiChatContext, ALL_TRANSLATION_OPTIONS, onOpenTopics }: any) => {
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
        "hidden md:flex fixed top-0 items-center justify-between h-14 px-6 backdrop-blur-md bg-background/85 border-b border-border transition-all duration-300 ease-out z-50",
        show ? "translate-y-0" : "-translate-y-full",
        offsetLeftClass,
        widthClass
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-sans min-w-0">
          <span className="text-foreground font-semibold text-base md:text-lg tracking-tight truncate">
            {surah?.englishName}
          </span>
          {surah?.englishNameTranslation && (
            <span className="text-muted-foreground text-xs truncate max-w-[200px]">
              ({surah?.englishNameTranslation})
            </span>
          )}
        </div>
        {surah?.revelationType && (
          <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-medium tracking-wider uppercase shrink-0">
            {surah.revelationType}
          </span>
        )}
      </div>

      {onOpenTopics && (
        <div className="flex items-center justify-center px-4">
          <button
            onClick={onOpenTopics}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-card hover:bg-muted text-xs font-medium text-foreground transition-all shrink-0 cursor-pointer shadow-xs hover:border-accent/40"
            title="Explore Topics in this Surah"
          >
            <Compass className="size-3.5 text-accent" />
            <span>Topics</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-5">
        <nav className="hidden lg:flex items-center gap-6 text-muted-foreground text-sm">
          <Link href="/home" className="hover:text-foreground transition">Home</Link>
          <Link href="/tafsir" className="hover:text-foreground transition">Tafsir</Link>
          <Link href="/lexicon" className="hover:text-foreground transition">Lexicon</Link>
          <Link href="/ai" className="hover:text-foreground transition">Translator</Link>
          <Link href="/rag" className="hover:text-foreground transition">AI Scholar</Link>
        </nav>
        <ThemeToggleButton />
      </div>
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
  onOpenTafsirPicker,
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
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("ayah_ai_seen")) {
        setPulseAi(true);
      }
    }
  }, []);

  const isTafsirEdition = React.useMemo(() => {
    return ["158", "97", "234", "151", "84", "95", "149", "156", "819", "831"].includes(translationEdition);
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

        const fetchPromises: Promise<any>[] = [];

        // 1. If it's a translation with Tafsir/Commentary (Dr. Israr, Maududi, Taqi Usmani, etc.)
        if (isTafsirEdition) {
          let authorId = "100158";
          if (translationEdition === "97" || translationEdition === "234" || translationEdition === "831") authorId = "138";
          if (translationEdition === "95") authorId = "100095";
          if (translationEdition === "151" || translationEdition === "84") authorId = "139";
          if (translationEdition === "156") authorId = "100156";
          if (translationEdition === "149") authorId = "100149";
          if (translationEdition === "819") authorId = "100819";
          if (translationEdition === "158") authorId = "158";

          fetchPromises.push(
            fetch(`/api/tafsir?authorId=${authorId}&surahId=${surahNumber}&ayahId=${ayah.numberInSurah}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.data && data.data[0]?.text) {
                  newFootnotes["tafsir_note"] = data.data[0].text;
                }
              })
              .catch(e => console.error("Error fetching dynamic tafsir note:", e))
          );
        }

        // 2. Standard Quran.com API footnotes - Batch & Parallel
        if (ayah.footnoteIds && ayah.footnoteIds.length > 0) {
          const idsToFetch = ayah.footnoteIds.join(",");
          fetchPromises.push(
            fetch(`/api/footnote?ids=${idsToFetch}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.footnotes) {
                  Object.assign(newFootnotes, data.footnotes);
                }
              })
              .catch(async () => {
                // Fallback to Quran.com direct parallel
                await Promise.all(
                  ayah.footnoteIds!.map(async (fId) => {
                    try {
                      const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${fId}`);
                      if (res.ok) {
                        const data = await res.json();
                        if (data?.foot_note?.text) {
                          newFootnotes[fId] = data.foot_note.text;
                        }
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  })
                );
              })
          );
        }

        await Promise.all(fetchPromises);
        setFetchedFootnotes(newFootnotes);
        setLoadingFootnotes(false);
      }
    } else {
      setShowFootnoteIds(false);
    }
  };

  const { mushafStyle, englishFont, urduFont } = useGlobalState();

  const isEnglishTranslation = React.useMemo(() => {
    const opt = ALL_TRANSLATION_OPTIONS.find(t => t.identifier === translationEdition);
    const code = (opt?.languageCode || "").toLowerCase();
    const label = (opt?.languageLabel || "").toLowerCase();
    return code === "en" || code === "english" || label === "english";
  }, [translationEdition]);

  const activeFontStyle = React.useMemo(() => {
    return getTranslationFontStyle(isUrduTranslation, isEnglishTranslation, urduFont, englishFont);
  }, [isUrduTranslation, isEnglishTranslation, urduFont, englishFont]);

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
          ? "border border-accent/50 bg-card/70 dark:bg-card/70 backdrop-blur-md  scale-[1.005] z-50 max-h-[80vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent"
          : "border border-accent/25 hover:border-accent/50 bg-card/50 dark:bg-card/50 ",
        isOtherPlaying ? "opacity-35 blur-[1px] scale-[0.995] pointer-events-none" : "opacity-100 blur-none scale-100"
      )}
      id={`ayah-${ayah.numberInSurah}`}
    >
      {isCurrentlyPlaying && (
        <div className="sticky top-0 z-50 flex justify-center w-full mb-4 sm:mb-8 mt-2 sm:mt-0 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-card border border-accent/30 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 pr-2 border-r border-border">
            <div className="flex items-end gap-[2px] h-3">
              <span className="w-[2px] h-full bg-accent animate-pulse" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-[2px] h-2/3 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-[2px] h-full bg-accent animate-pulse" style={{ animationDelay: '0.3s' }}></span>
            </div>
            <span className="text-[9px] font-bold text-accent tracking-[0.15em] uppercase hidden sm:inline">Now Playing</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (ayah.numberInSurah > 1) {
                  window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah - 1 } }));
                }
              }} 
              className="p-1 hover:bg-muted rounded-full text-reading transition"
              title="Previous Ayah"
            >
              <SkipBack className="size-3.5" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('pausePlayerAudio'));
              }} 
              className="p-1.5 bg-accent hover:bg-accent rounded-full text-foreground shadow-md transition"
              title="Pause & Return to Default Mode"
            >
              <Pause className="size-3.5 fill-current" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah + 1 } }));
              }} 
              className="p-1 hover:bg-muted rounded-full text-reading transition"
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
        <span className="px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-xs font-bold text-accent">
          {surahNumber}:{ayah.numberInSurah}
        </span>
        <div className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center">
          <Copy
            className="text-muted-foreground"
            size={18}
            onClick={() => handleCopyAyah(ayah)}
          />
        </div>
        <div
          onClick={() => handleSaveAyah(ayah)}
          className="p-2 rounded-full dark:hover:bg-muted hover:bg-[var(--sephia-500)]/45 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Save Ayah"
        >
          <Save className="text-muted-foreground" size={18} />
        </div>
        <div
          onClick={() => {
            if (isCurrentlyPlaying) {
              window.dispatchEvent(new CustomEvent('pausePlayerAudio'));
            } else {
              window.dispatchEvent(new CustomEvent('changePlayerAyah', { detail: { ayah: ayah.numberInSurah, openFab: true } }));
            }
          }}
          className="p-2 rounded-full dark:hover:bg-muted hover:bg-[var(--sephia-500)]/45 transition-colors cursor-pointer inline-flex items-center justify-center"
          title={isCurrentlyPlaying ? "Pause Recitation" : `Play Recitation for Ayah ${ayah.numberInSurah}`}
        >
          {isCurrentlyPlaying ? (
            <Pause size={18} className="text-accent" />
          ) : (
            <Play size={18} className="text-muted-foreground hover:text-accent" />
          )}
        </div>
        <button
          onClick={() => onOpenTafsirPicker(surahNumber, ayah.numberInSurah)}
          className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Read Tafsir"
        >
          <ScrollText className="text-accent hover:text-accent" size={18} />
        </button>
        <Link
          href={`/lexicon?surah=${surahNumber}&ayah=${ayah.numberInSurah}`}
          className="p-2 rounded-full hover:bg-muted transition-colors cursor-pointer inline-flex items-center justify-center"
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
              ? (isSidebarOpen ? "w-full sm:pr-4 md:pr-6" : "w-full sm:pr-8 md:pr-16")
              : (isSidebarOpen ? "w-full md:pr-4" : "reading-measure")
          )}>
            <div>
              <span
                className="text-reading md:leading-[1.7] leading-[1.7] translation-content reading-prose"
                style={{ 
                  fontSize: getTranslationFontSize(fontSize, isUrduTranslation),
                  fontFamily: activeFontStyle.fontFamily,
                  lineHeight: activeFontStyle.lineHeight || (isUrduTranslation ? "2.6" : undefined),
                  textAlign: isUrduTranslation ? "right" : undefined,
                  direction: isUrduTranslation ? "rtl" : undefined,
                  display: "block",
                  width: "100%"
                }}
                dangerouslySetInnerHTML={{ __html: mainText }}
              />
            </div>

            {(hasFootnotesAvailable && showFootnoteIds) ? (
              <div className="mt-3 p-4 rounded-xl bg-card border border-border text-sm text-foreground max-h-80 overflow-y-auto custom-scrollbar relative shadow-md">
                <div className="font-semibold text-accent uppercase tracking-wider text-[11px] sticky -top-4 -mx-4 px-4 py-2.5 bg-card/95 backdrop-blur-md z-10 mb-3 border-b border-border shadow-sm flex items-center justify-between">
                  <span className="text-accent font-bold uppercase tracking-wider text-[11px]">
                    FOOTNOTES & COMMENTARY NOTES
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-md border border-accent/25">
                    {isTafsirEdition ? "EXPLANATIONS" : "FOOTNOTES"}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {loadingFootnotes ? (
                    <p className="text-accent animate-pulse text-xs py-2">Loading notes...</p>
                  ) : (
                    <>
                      {/* Dynamic Tafsir / Explanation Note for Dr. Israr, Maududi, Taqi Usmani */}
                      {fetchedFootnotes["tafsir_note"] && (
                        <div 
                          className="leading-[2.8] text-foreground text-right p-3 rounded-lg bg-card/70 border border-border"
                          dir={isUrduTranslation ? "rtl" : "auto"}
                          style={{ 
                            fontFamily: activeFontStyle.fontFamily,
                            lineHeight: activeFontStyle.lineHeight || (isUrduTranslation ? "2.8" : undefined),
                            fontSize: isUrduTranslation ? "1.15rem" : undefined,
                          }}
                          dangerouslySetInnerHTML={{ __html: cleanUrduFootnoteText(fetchedFootnotes["tafsir_note"]) }}
                        />
                      )}

                      {/* Inline/extracted footnotes */}
                      {footnotes.length > 0 && footnotes.map((fn, fIdx) => (
                        <div 
                          key={`inline-${fIdx}`} 
                          className="leading-relaxed text-foreground p-2.5 rounded bg-card/70 border border-border" 
                          dir={isUrduTranslation ? "rtl" : "auto"}
                          style={{
                            fontFamily: activeFontStyle.fontFamily,
                            lineHeight: activeFontStyle.lineHeight,
                          }}
                        >
                          {fn}
                        </div>
                      ))}

                      {/* API fetched footnotes */}
                      {ayah.footnoteIds && ayah.footnoteIds.length > 0 && (
                        ayah.footnoteIds.map((fId, idx) => (
                          <div 
                            key={fId} 
                            className="leading-relaxed p-2.5 rounded bg-card/70 border border-border text-foreground" 
                            dir={isUrduTranslation ? "rtl" : "auto"}
                            style={{ 
                              fontFamily: activeFontStyle.fontFamily,
                              lineHeight: activeFontStyle.lineHeight || (isUrduTranslation ? "2.6" : undefined),
                              fontSize: isUrduTranslation ? "1.1rem" : undefined,
                            }}
                          >
                            <span className="text-accent font-bold mx-2 inline-block" dir="ltr">[{idx + 1}]</span>
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
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 hover:bg-accent/10 border border-accent/35 hover:border-accent/80 opacity-75 hover:opacity-100 transition-all cursor-pointer shadow-sm"
              >
                <Bot size={14} className="text-accent group-hover:text-accent transition-colors animate-bounce" />
                <span className="text-[11px] font-semibold tracking-wide text-accent group-hover:text-foreground transition-colors">
                  Ask Tafsir Scholar
                </span>
              </button>

              {hasFootnotesAvailable && (
                <button
                  onClick={handleToggleFootnotes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 hover:bg-accent/10 border border-accent/35 hover:border-accent/80 opacity-75 hover:opacity-100 transition-all cursor-pointer group shadow-sm"
                  title={showFootnoteIds ? "Hide Footnotes" : "Show Footnotes & Commentary"}
                >
                  <MessageSquareText size={14} className="text-accent group-hover:text-accent transition-colors" />
                  <span className="text-[11px] font-semibold tracking-wide text-accent group-hover:text-foreground transition-colors">
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
  const targetAyahFromParam = useMemo(() => {
    if (ayahParam) {
      const num = Number(ayahParam);
      if (!isNaN(num) && num >= 1 && num <= totalAyahs) return num;
    }
    return 1;
  }, [ayahParam, totalAyahs]);

  const [visibleAyahNumber, setVisibleAyahNumber] = useState<number>(targetAyahFromParam);
  const visibleAyahRef = useRef<number>(targetAyahFromParam);

  useEffect(() => {
    if (targetAyahFromParam > 1) {
      visibleAyahRef.current = targetAyahFromParam;
      setVisibleAyahNumber(targetAyahFromParam);
    }
  }, [targetAyahFromParam]);
  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);
  const [tafsirWheelContext, setTafsirWheelContext] = useState<{ surah: number; ayah: number } | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);

  const currentTranslationOption = useMemo(() => {
    return ALL_TRANSLATION_OPTIONS.find(t => t.identifier === translationEdition);
  }, [translationEdition]);

  // ─── Paginated loading state & Instant Translation Cache ─────────────────────
  // Pre-calculate initial loaded pages from SSR initialAyahs
  const initialLoadedPages = useMemo(() => {
    const pages = new Set<number>([0]);
    if (ayahParam) {
      const targetAyahNum = Number(ayahParam);
      if (!isNaN(targetAyahNum) && targetAyahNum > 0 && targetAyahNum <= totalAyahs) {
        pages.add(Math.floor((targetAyahNum - 1) / PAGE_SIZE));
      }
    }
    return pages;
  }, [ayahParam, totalAyahs]);

  // Keyed by 0-based index. Starts pre-populated with the server-rendered pages.
  const [loadedAyahs, setLoadedAyahs] = useState<Record<number, AyahProps>>(() => {
    const map: Record<number, AyahProps> = {};
    initialAyahs.forEach((a, i) => {
      const idx = typeof a.numberInSurah === "number" && a.numberInSurah > 0 ? a.numberInSurah - 1 : i;
      map[idx] = a;
    });
    return map;
  });

  const [isSwitchingTranslation, setIsSwitchingTranslation] = useState(false);

  // In-memory client cache: stores loaded ayahs per translation edition for 0ms instant switches
  const translationCacheRef = useRef<Map<string, { ayahs: Record<number, AyahProps>; pages: Set<number> }>>(
    new Map([
      [`${surah?.number || 1}:${initialEdition}`, {
        ayahs: initialAyahs.reduce((acc, a, i) => {
          const idx = typeof a.numberInSurah === "number" && a.numberInSurah > 0 ? a.numberInSurah - 1 : i;
          acc[idx] = a;
          return acc;
        }, {} as Record<number, AyahProps>),
        pages: new Set(initialLoadedPages)
      }]
    ])
  );

  // Which page numbers are already loaded / currently in-flight (avoid duplicate fetches)
  const loadedPagesRef = useRef<Set<number>>(new Set(initialLoadedPages));
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

        // Update in-memory translation cache
        const cacheKey = `${surahNumber}:${edition}`;
        const existing = translationCacheRef.current.get(cacheKey) || { ayahs: {}, pages: new Set<number>() };
        existing.ayahs = { ...existing.ayahs, ...next };
        existing.pages.add(page);
        translationCacheRef.current.set(cacheKey, existing);

        return next;
      });
      loadedPagesRef.current.add(page);
    } catch (e) {
      console.error("[SurahReader] Failed to fetch page", page, e);
    } finally {
      loadingPagesRef.current.delete(page);
    }
  }, [surahNumber]);

  const handleSelectTopicAyah = useCallback((ayahNum: number) => {
    const index = ayahNum - 1;
    setIsNavigatingAyah(true);
    virtuosoRef.current?.scrollToIndex({ index, align: "center", behavior: "smooth" });
    const targetPage = Math.floor(index / PAGE_SIZE);
    fetchPage(targetPage, translationEdition).then(() => {
      setTimeout(() => {
        setIsNavigatingAyah(false);
        const element = document.getElementById(`ayah-${ayahNum}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-accent", "bg-accent/10");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-accent", "bg-accent/10");
          }, 3000);
        }
      }, 150);
    });
  }, [fetchPage, translationEdition]);

  // When translation edition changes:
  // 1. If in cache -> 0ms instant swap
  // 2. If not -> trigger immediate fetch of visible pages and show progress bar
  const isFirstEditionMount = useRef(true);
  useEffect(() => {
    if (isFirstEditionMount.current) {
      isFirstEditionMount.current = false;
      return;
    }

    const cacheKey = `${surahNumber}:${translationEdition}`;
    const cached = translationCacheRef.current.get(cacheKey);

    if (cached && Object.keys(cached.ayahs).length > 0) {
      // 0ms INSTANT cache restore
      loadedPagesRef.current = new Set(cached.pages);
      loadingPagesRef.current = new Set();
      setLoadedAyahs({ ...cached.ayahs });
      setIsSwitchingTranslation(false);
      return;
    }

    // Reset and immediately trigger fetching page 0 (and visible page)
    setIsSwitchingTranslation(true);
    loadedPagesRef.current = new Set();
    loadingPagesRef.current = new Set();
    setLoadedAyahs({});

    const currentVisibleAyah = visibleAyahRef.current || 1;
    const targetPage = Math.max(0, Math.floor((currentVisibleAyah - 1) / PAGE_SIZE));

    fetchPage(targetPage, translationEdition)
      .then(() => {
        setIsSwitchingTranslation(false);
        if (targetPage === 0 && totalAyahs > PAGE_SIZE) {
          fetchPage(1, translationEdition);
        }
      })
      .catch(() => {
        setIsSwitchingTranslation(false);
      });
  }, [translationEdition, surahNumber, fetchPage, totalAyahs]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Proactively prefetch adjacent Surahs so navigating to Next/Previous Surah is 100% instant
  useEffect(() => {
    if (surahNumber > 1) {
      router.prefetch(`/surah/${surahNumber - 1}`);
    }
    if (surahNumber < 114) {
      router.prefetch(`/surah/${surahNumber + 1}`);
    }
  }, [surahNumber, router]);

  // All clean texts for SurahPlayer (needed for audio segment tracking).
  // Derived from allArabicTexts so we don’t need all ayahs loaded.
  const allCleanTexts = useMemo(
    () => allArabicTexts.map(t => t.replace(/[\u064B-\u065F\u0670]/g, "")),
    [allArabicTexts]
  );


  const handleOpenAiChat = useCallback((surah: number, ayah?: number) => {
    const targetAyah = typeof ayah === "number" && ayah > 0 ? ayah : visibleAyahRef.current;
    React.startTransition(() => {
      setAiChatContext({ surah, ayah: targetAyah });
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("close-left-sidebar"));
    }
  }, []);

  const handleOpenTafsirPicker = useCallback((surah: number, ayah: number) => {
    setTafsirWheelContext({ surah, ayah });
  }, []);

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
    const handleOpenTopics = () => setIsTopicModalOpen(true);
    window.addEventListener('scrollToAyah', handleScroll);
    window.addEventListener('jumpToAyah', handleJump);
    window.addEventListener('open-topic-modal', handleOpenTopics);
    return () => {
      window.removeEventListener('scrollToAyah', handleScroll);
      window.removeEventListener('jumpToAyah', handleJump);
      window.removeEventListener('open-topic-modal', handleOpenTopics);
    }
  }, []);

  const [collapsed, setCollapsed] = useState(true);
  const [isNavigatingAyah, setIsNavigatingAyah] = useState(false);

  const isUrduTranslation = React.useMemo(() => {
    const opt = ALL_TRANSLATION_OPTIONS.find(t => t.identifier === translationEdition);
    const code = (opt?.languageCode || "").toLowerCase();
    const label = (opt?.languageLabel || "").toLowerCase();
    return code === 'ur' || code === 'urdu' || label === 'urdu';
  }, [translationEdition]);

  // Clear audio state on unmount or surah change
  useEffect(() => {
    const clearAudio = useAudioStore.getState().clearAudio;
    return () => clearAudio();
  }, [surahNumber]);

  // Save current reading position to localStorage["recent"]
  const saveRecentPosition = useCallback((ayahNum: number) => {
    if (!surah || !surah.number) return;
    setRecentQuranReading({
      ...surah,
      lastReadAyah: ayahNum,
    });
  }, [surah]);

  const debouncedSaveRecent = useMemo(() => {
    let timer: NodeJS.Timeout | null = null;
    const fn = (ayahNum: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveRecentPosition(ayahNum);
      }, 300);
    };
    fn.cancel = () => {
      if (timer) clearTimeout(timer);
    };
    return fn;
  }, [saveRecentPosition]);

  // Accurately detect the ayah currently in the user's reading line (~35% of viewport)
  const getVisibleAyahInViewport = useCallback((): number | null => {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const ayahElements = document.querySelectorAll<HTMLElement>('[id^="ayah-"]');
    if (!ayahElements || ayahElements.length === 0) return null;

    const readingLine = window.innerHeight * 0.35;
    let closestAyah: number | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < ayahElements.length; i++) {
      const el = ayahElements[i];
      const rect = el.getBoundingClientRect();
      const numStr = el.id.replace("ayah-", "");
      const ayahNum = parseInt(numStr, 10);
      if (isNaN(ayahNum)) continue;

      // Direct hit: the ayah element spans across the reading line
      if (rect.top <= readingLine && rect.bottom >= readingLine) {
        return ayahNum;
      }

      // Check distance for elements visible or nearest to reading line
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const distance = Math.abs(rect.top - readingLine);
        if (distance < minDistance) {
          minDistance = distance;
          closestAyah = ayahNum;
        }
      }
    }

    return closestAyah;
  }, []);

  // Real-time viewport scroll tracking to detect exact ayah in reader view
  useEffect(() => {
    let rAF: number | null = null;

    const handleScroll = () => {
      if (isNavigatingAyah) return;
      if (rAF) return;
      rAF = requestAnimationFrame(() => {
        rAF = null;
        const currentAyah = getVisibleAyahInViewport();
        if (currentAyah && currentAyah !== visibleAyahRef.current) {
          visibleAyahRef.current = currentAyah;
          setVisibleAyahNumber(currentAyah);
          debouncedSaveRecent(currentAyah);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rAF) cancelAnimationFrame(rAF);
    };
  }, [getVisibleAyahInViewport, debouncedSaveRecent, isNavigatingAyah]);

  // Record reading position on mount
  useEffect(() => {
    if (surah && surah.number) {
      if (ayahParam) {
        const targetAyah = Number(ayahParam);
        if (!isNaN(targetAyah) && targetAyah >= 1 && targetAyah <= totalAyahs) {
          saveRecentPosition(targetAyah);
        }
      } else {
        saveRecentPosition(1);
      }
    }
  }, [surah, ayahParam, totalAyahs, saveRecentPosition]);

  // Flush reading position before unload, pagehide (BFCache navigation), or unmount
  useEffect(() => {
    const handleFlush = () => {
      const activeAyah = getVisibleAyahInViewport() || visibleAyahRef.current;
      if (activeAyah) {
        saveRecentPosition(activeAyah);
      }
    };

    window.addEventListener("beforeunload", handleFlush);
    window.addEventListener("pagehide", handleFlush);
    return () => {
      window.removeEventListener("beforeunload", handleFlush);
      window.removeEventListener("pagehide", handleFlush);
      debouncedSaveRecent.cancel();
      handleFlush();
    };
  }, [getVisibleAyahInViewport, saveRecentPosition, debouncedSaveRecent]);

  // Sync active reading position when recitation audio advances
  useEffect(() => {
    const unsubscribe = useAudioStore.subscribe((state) => {
      if (state.isPlaying && state.currentSurah === surahNumber && state.currentAyah) {
        visibleAyahRef.current = state.currentAyah;
        setVisibleAyahNumber(state.currentAyah);
        debouncedSaveRecent(state.currentAyah);
      }
    });
    return () => unsubscribe();
  }, [surahNumber, debouncedSaveRecent]);

  // Scroll to the selected ayah (if provided via the "ayah" search param).
  // Pre-fetch the page containing the target ayah so it’s ready when we scroll.
  useEffect(() => {
    if (ayahParam && totalAyahs > 0) {
      const targetAyahNum = Number(ayahParam);
      const ayahIndex = targetAyahNum - 1; // 0-based
      if (ayahIndex >= 0 && ayahIndex < totalAyahs) {
        setIsNavigatingAyah(true);
        const targetPage = Math.floor(ayahIndex / PAGE_SIZE);

        const performScroll = () => {
          virtuosoRef.current?.scrollToIndex({ index: ayahIndex, align: 'center', behavior: 'auto' });
          
          const checkAndHighlight = (attempts = 0) => {
            const element = document.getElementById(`ayah-${targetAyahNum}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const c = ["ring-2", "ring-accent", "bg-accent/10", "transition-all"];
              element.classList.add(...c);
              setTimeout(() => element.classList.remove(...c), 2500);
              setIsNavigatingAyah(false);
            } else if (attempts < 5) {
              setTimeout(() => checkAndHighlight(attempts + 1), 100);
            } else {
              setIsNavigatingAyah(false);
            }
          };

          setTimeout(() => checkAndHighlight(), 80);
        };

        if (loadedPagesRef.current.has(targetPage)) {
          performScroll();
        } else {
          fetchPage(targetPage, translationEdition).then(() => {
            performScroll();
          });
        }
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
            <p className="font-semibold text-accent">Already saved</p>
            <p className="text-sm text-foreground">
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
          <p className="font-semibold text-accent">Saved Ayah</p>
        </div>
      </div>
    );
  }, [surahNumber]);

  return (
    <div className="flex w-full min-h-screen relative bg-background">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isNavigatingAyah && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99999] bg-background/70 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 bg-card border border-border px-6 py-4 rounded-xl shadow-lg text-center">
              <LogoIcon size={28} className="text-accent animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-foreground">Al-Juthur</span>
              <span className="text-[11px] text-muted-foreground font-mono mt-0.5">Locating verse...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className={cn(
        "flex items-center flex-col bg-background text-foreground relative pb-6 md:pb-6 transition-all duration-300",
        aiChatContext ? "w-full lg:w-[calc(100%-420px)] xl:w-[calc(100%-450px)]" : "w-full flex-1"
      )}>
        <DesktopSurahHeader 
          surah={surah} 
          translationEdition={translationEdition} 
          aiChatContext={aiChatContext} 
          ALL_TRANSLATION_OPTIONS={ALL_TRANSLATION_OPTIONS} 
          onOpenTopics={() => setIsTopicModalOpen(true)}
        />

        <div className="flex items-center text-center w-full flex-col pt-16 md:pt-16 mb-1 md:mb-2 relative z-20">
          <BismillahIcon className="text-arabic lg:max-w-56 md:max-w-48 max-w-36 sm:max-w-44" />
          
          <div className="mt-2.5 mb-1 flex items-center justify-center gap-2 flex-wrap max-w-3xl">
            {surahInfo && (
              <button
                onClick={() => setShowSurahContext(!showSurahContext)}
                className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border hover:border-accent/40 cursor-pointer transition-colors"
                title={showSurahContext ? "Hide Context" : "Read Surah Context and Theme"}
              >
                <Compass size={14} className="text-muted-foreground relative z-10" />
                <span className="text-[11px] md:text-[12px] font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors uppercase relative z-10">
                  {showSurahContext ? "Close Context" : "Context & Theme"}
                </span>
              </button>
            )}
          </div>

          {surahInfo && (
            <div className="flex flex-col items-center w-full max-w-3xl">

              {showSurahContext && (
                <div className="mt-4 p-5 sm:p-6 w-full rounded-xl bg-card border border-border text-sm text-reading relative animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent"></div>
                  
                  <div className="font-semibold text-accent uppercase tracking-wider text-[11px] mb-5 border-b border-accent/20 pb-3 flex items-center justify-between">
                    <span className="text-accent font-bold uppercase tracking-wider text-[12px] flex items-center gap-2">
                      <MapIcon size={15} />
                      CONTEXT & THEME OF {surahInfo.surah_name?.toUpperCase() || surah?.englishName?.toUpperCase()}
                    </span>
                    <button onClick={() => setShowSurahContext(false)} className="hover:bg-muted p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                      <span className="sr-only">Close</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4 leading-relaxed text-reading">
                    {surahInfo.bismillah_pre_ayah && (
                      <p className="text-xs text-accent italic font-mono bg-accent/10 p-2 rounded-lg border border-accent/15 mb-3">
                        Note: Bismillah is included as part of this Surah.
                      </p>
                    )}
                    <div 
                      className="text-foreground leading-relaxed max-w-none text-xs sm:text-sm [&>h2]:text-accent [&>h2]:font-bold [&>h2]:text-sm sm:[&>h2]:text-base [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h2:first-child]:mt-0 [&>h3]:text-accent [&>h3]:font-bold [&>h3]:text-xs sm:[&>h3]:text-sm [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2.5 [&>ol]:list-decimal [&>ol]:ml-5 [&>ol]:mb-2.5 [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mb-2.5 [&>li]:mb-1 [&>a]:text-accent [&>a:hover]:underline [&>strong]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: surahInfo.heading || surahInfo.text }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col w-full min-h-screen px-3 sm:px-6 md:px-10 lg:px-16 max-w-4xl mx-auto">
          <Virtuoso
            ref={virtuosoRef}
            useWindowScroll
            initialTopMostItemIndex={
              ayahParam && Number(ayahParam) > 1 && Number(ayahParam) <= totalAyahs
                ? Number(ayahParam) - 1
                : 0
            }
            totalCount={totalAyahs}
            defaultItemHeight={280}
            overscan={{ main: 1000, reverse: 1000 }}
            increaseViewportBy={{ top: 600, bottom: 600 }}
            rangeChanged={({ startIndex, endIndex }) => {
              if (!isNavigatingAyah) {
                const detected = getVisibleAyahInViewport();
                if (detected && detected !== visibleAyahRef.current) {
                  visibleAyahRef.current = detected;
                  setVisibleAyahNumber(detected);
                  debouncedSaveRecent(detected);
                }
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
                  onOpenTafsirPicker={handleOpenTafsirPicker}
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

      <TafsirWheelPickerModal
        isOpen={!!tafsirWheelContext}
        onClose={() => setTafsirWheelContext(null)}
        surahNumber={tafsirWheelContext?.surah || surahNumber}
        ayahNumber={tafsirWheelContext?.ayah || 1}
        onSelectTafsir={(authorId) => {
          if (tafsirWheelContext) {
            router.push(`/tafsir?surah=${tafsirWheelContext.surah}&ayah=${tafsirWheelContext.ayah}&author=${authorId}`);
          }
        }}
      />

      <TopicSearchModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        mode="surah"
        surahId={surahNumber}
        surahName={surah?.englishName || `Surah ${surahNumber}`}
        loadedAyahs={Object.values(loadedAyahs)}
        onSelectAyah={(ayahNum) => handleSelectTopicAyah(ayahNum)}
      />

    </div>
  );
}
