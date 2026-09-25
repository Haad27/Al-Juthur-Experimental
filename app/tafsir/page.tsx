"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ArrowLeft, BookOpen, Search, Sparkles, ChevronRight, ChevronLeft, Copy, Languages, User, BookOpenText, ChevronUp, ChevronDown, X, Bot, Compass, Filter, Library, Check, Bookmark, BookmarkCheck, Lock, Columns2, AlertCircle, RotateCcw, Edit3, Highlighter, PenTool, Wrench, StickyNote } from "lucide-react";
import dynamic from "next/dynamic";
import TafsirHorizontalReader from "@/components/tafsir/TafsirHorizontalReader";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import TafsirTextRenderer from "@/components/tafsir/TafsirTextRenderer";
import { amiriquran, inter } from "@/app/fonts";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
import FloatingAskScholarButton from "@/components/ai/FloatingAskScholarButton";
import AyahWheelPickerModal from "@/components/tafsir/AyahWheelPickerModal";
import ContinueReadingBanner from "@/components/tafsir/ContinueReadingBanner";
import AppHeader from "@/components/layout/AppHeader";
import TafsirComparePanel from "@/components/tafsir/TafsirComparePanel";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";
import { 
  getLastReadTafsir, 
  setLastReadTafsir, 
  saveTafsirItem, 
  isTafsirSaved, 
  LastReadTafsir,
  saveUserHighlight,
  fetchUserHighlights,
  deleteUserHighlight,
  UserHighlight,
  fetchUserNotes,
  UserNote,
} from "@/lib/readerStorage";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { getEnglishFont, getUrduFont } from "@/lib/fontsConfig";
import { copyToClipboard, cn } from "@/lib/utils";
import AyahNoteModal from "@/components/quran/AyahNoteModal";
import HighlightToolbar, { HighlightColor, HighlightSelection } from "@/components/tafsir/HighlightToolbar";
import { getTafsirFameRank, getLanguagePriority, getTafsirDifficulty } from "@/lib/tafsirRanking";
import { getTafsirWarning } from "@/lib/tafsirWarnings";
import TopicSearchModal from "@/components/shared/TopicSearchModal";
import InlineTranslation from "@/components/shared/InlineTranslation";
import AlJuthurLoadingProgress from "@/components/shared/AlJuthurLoadingProgress";
import { isTafsirMatch, filterTafsirs } from "@/lib/searchUtils";

interface Author {
  id: number;
  name: string;
  authorName?: string;
  languageId: number;
  era?: string;
  difficulty?: string;
  tags?: { id: number; name: string; color: string }[];
}

interface Language {
  id: number;
  code: string;
  name: string;
  authors: Author[];
}

interface Ayah {
  id: number;
  surahId: number;
  numberInSurah: number;
  text: string;
}

interface TafsirEntry {
  id: number;
  authorId: number;
  surahId: number;
  ayahId: number;
  text: string;
  ayah?: Ayah;
  author?: Author;
  footnoteIds?: string[];
  footnotes?: Record<string, string>;
}

export function isFreeTafsirAuthor(name?: string, authorName?: string): boolean {
  const n = (name || "").toLowerCase();
  const a = (authorName || "").toLowerCase();
  if (n.includes("kathir") || a.includes("kathir")) return true;
  if (n.includes("jalalayn") || a.includes("jalal") || n.includes("jalal")) return true;
  if (n.includes("sa'di") || n.includes("saadi") || n.includes("sadi") || a.includes("sa'di") || a.includes("saadi")) return true;
  return false;
}

const getTagColorClass = (color?: string) => {
  switch (color) {
    case "amber":
    case "emerald":
    case "blue":
    case "purple":
    case "cyan":
      return "bg-accent/10 text-accent border-accent/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const normalizeText = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''`'"\-–—:;,.()\[\]\/]/g, " ")
    .replace(/\b(tafseer|tafsir)\b/g, "tafsir")
    .replace(/\b(kaseer|kahtir|katheer)\b/g, "kathir")
    .replace(/\b(saddi|saadi|sadi)\b/g, "saadi")
    .replace(/\b(ashour|ashur)\b/g, "ashur")
    .replace(/\b(qatab|qutb|qutub)\b/g, "qutb")
    .replace(/\b(syed|sayyid|sayed)\b/g, "sayyid")
    .replace(/\b(thanwi|thanvi)\b/g, "thanwi")
    .replace(/\b(jalalayn|jalalain)\b/g, "jalalayn")
    .replace(/\s+/g, " ")
    .trim();
};

const matchesSmartSearch = (
  author: Author,
  language: Language,
  query: string
): boolean => {
  return isTafsirMatch(query, author, language);
};

const TafsirFootnotesLoader = ({ 
  footnoteIds, 
  initialFootnotes,
  isUrdu 
}: { 
  footnoteIds: string[]; 
  initialFootnotes?: Record<string, string>;
  isUrdu?: boolean;
}) => {
  const { englishFont, urduFont } = useGlobalState();
  const selectedUrduFont = getUrduFont(urduFont);
  const selectedEnglishFont = getEnglishFont(englishFont);
  const [fetchedFootnotes, setFetchedFootnotes] = useState<Record<string, string>>(initialFootnotes || {});
  const [loading, setLoading] = useState(!initialFootnotes || Object.keys(initialFootnotes).length === 0);

  useEffect(() => {
    let isMounted = true;
    const newFootnotes = { ...(initialFootnotes || {}), ...fetchedFootnotes };
    const missingIds = footnoteIds.filter(fId => !newFootnotes[fId]);

    if (missingIds.length === 0) {
      setLoading(false);
      setFetchedFootnotes(newFootnotes);
      return;
    }

    setLoading(true);
    const fetchAll = async () => {
      if (missingIds.length > 0) {
        try {
          const res = await fetch(`/api/footnote?ids=${missingIds.join(",")}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.footnotes) {
              Object.assign(newFootnotes, data.footnotes);
            }
          }
        } catch {
          await Promise.all(
            missingIds.map(async (fId) => {
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
        }
      }

      if (isMounted) {
        setFetchedFootnotes(newFootnotes);
        setLoading(false);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [footnoteIds, initialFootnotes]);

  if (loading && Object.keys(fetchedFootnotes).length === 0) {
    return <p className="text-accent animate-pulse text-xs">Loading commentary notes...</p>;
  }

  return (
    <div className="space-y-6 mt-3">
      {footnoteIds.map((fId, idx) => (
        <div key={fId} className="w-full">
          <div className="flex items-center justify-between pb-2 border-b border-accent/20 mb-3">
            <div className="flex items-center gap-2 font-bold text-accent text-xs md:text-sm tracking-wider uppercase">
              <BookOpenText className="size-4 text-accent" />
              <span>{isUrdu ? "تفسیر (TAFSIR)" : "TAFSIR"}</span>
            </div>
            <span className="text-accent font-bold px-2.5 py-0.5 bg-accent/10 rounded-full border border-accent/30 text-xs font-mono" dir="ltr">
              [{idx + 1}]
            </span>
          </div>
          <div 
            className="w-full text-foreground leading-relaxed text-sm md:text-base" 
            dir={isUrdu ? "rtl" : "auto"}
            style={{
              fontFamily: isUrdu ? selectedUrduFont.fontFamily : selectedEnglishFont.fontFamily,
              lineHeight: isUrdu ? (selectedUrduFont.lineHeight || "2.6") : (selectedEnglishFont.lineHeight || "1.8"),
              fontSize: isUrdu ? "1.22rem" : undefined
            }}
            dangerouslySetInnerHTML={{ __html: fetchedFootnotes[fId] || "Explanation loading..." }} 
          />
        </div>
      ))}
    </div>
  );
};

function TafsirContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [selectedEra, setSelectedEra] = useState<string>("All Eras");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All Levels");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteSelectedText, setNoteSelectedText] = useState<string>("");
  
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  
  const [highlightSelection, setHighlightSelection] = useState<HighlightSelection | null>(null);

  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [showHighlightOnboarding, setShowHighlightOnboarding] = useState(false);

  useEffect(() => {
    fetchUserHighlights().then(setHighlights).catch(console.error);
    fetchUserNotes().then(setNotes).catch(console.error);
  }, []);

  // When highlight mode is on, we inject a style to change the text selection color to amber/gold
  const highlightModeStyle = isHighlightMode ? (
    <style dangerouslySetInnerHTML={{__html: `
      ::selection {
        background-color: rgba(245, 158, 11, 0.4) !important;
        color: inherit !important;
      }
      *::selection {
        background-color: rgba(245, 158, 11, 0.4) !important;
        color: inherit !important;
      }
    `}} />
  ) : null;

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll when mobile filter sheet is open
  useEffect(() => {
    if (isFilterPanelOpen && typeof window !== "undefined" && window.innerWidth < 768) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isFilterPanelOpen]);


  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const langScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingLang, setIsDraggingLang] = useState(false);
  const [canScrollLangLeft, setCanScrollLangLeft] = useState(false);
  const [canScrollLangRight, setCanScrollLangRight] = useState(false);
  const dragStartRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const checkLangScrollability = useCallback(() => {
    const el = langScrollRef.current;
    if (!el) return;
    setCanScrollLangLeft(el.scrollLeft > 4);
    setCanScrollLangRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = langScrollRef.current;
    if (!el) return;
    checkLangScrollability();
    el.addEventListener("scroll", checkLangScrollability, { passive: true });
    window.addEventListener("resize", checkLangScrollability);
    return () => {
      el.removeEventListener("scroll", checkLangScrollability);
      window.removeEventListener("resize", checkLangScrollability);
    };
  }, [checkLangScrollability, languages]);

  const handleLangPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    const el = langScrollRef.current;
    if (!el) return;

    dragStartRef.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
    };
  };

  const handleLangPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current.isDown || e.pointerType === "touch") return;
    const el = langScrollRef.current;
    if (!el) return;

    const delta = e.clientX - dragStartRef.current.startX;
    if (Math.abs(delta) > 8) {
      dragStartRef.current.hasMoved = true;
      setIsDraggingLang(true);
      el.scrollLeft = dragStartRef.current.scrollLeft - delta;
      checkLangScrollability();
    }
  };

  const handleLangPointerUp = () => {
    if (dragStartRef.current.isDown) {
      dragStartRef.current.isDown = false;
      setIsDraggingLang(false);
      setTimeout(() => {
        dragStartRef.current.hasMoved = false;
      }, 60);
    }
  };

  const scrollLangHorizontally = (direction: "left" | "right") => {
    const el = langScrollRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ERAS = useMemo(() => [
    "All Eras",
    "Early Classical (7th-10th CE)",
    "Medieval (11th-14th CE)",
    "Post-Classical (15th-18th CE)",
    "Modern & Contemporary (19th-21st CE)"
  ], []);

  // Reading Mode State
  // URL param target
  const urlAyah = searchParams?.get("ayah");
  const urlSurah = searchParams?.get("surah");
  const urlAuthor = searchParams?.get("author");

  const parsedUrlAuthorId = urlAuthor && !isNaN(parseInt(urlAuthor)) ? parseInt(urlAuthor) : null;
  const parsedUrlSurahId = urlSurah && !isNaN(parseInt(urlSurah)) ? parseInt(urlSurah) : 1;
  const parsedUrlAyah = urlAyah && !isNaN(parseInt(urlAyah)) ? parseInt(urlAyah) : null;

  // Reading Mode State
  const [activeAuthor, setActiveAuthor] = useState<Author | null>(() => {
    if (parsedUrlAuthorId) {
      return { id: parsedUrlAuthorId, name: `Tafsir #${parsedUrlAuthorId}`, languageId: 1 };
    }
    return null;
  });
  const [activeLangName, setActiveLangName] = useState<string>("");
  const [activeSurah, setActiveSurah] = useState<number>(parsedUrlSurahId);

  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const text = selection.toString().trim();
      if (!text || text.length < 2) {
        return;
      }

      // Start from the element that contains the anchor node
      const startEl = (range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer as HTMLElement);

      if (!startEl) return;

      // Determine type from the closest matching ancestor
      let type: "arabic" | "translation" | null = null;
      if (startEl.closest(".tafsir-content")) {
        type = "translation";
      } else if (startEl.closest("[lang='ar']") || startEl.closest("[id^='atext-']")) {
        type = "arabic";
      } else {
        // fallback: anything inside a TafsirCard counts as translation
        const card = startEl.closest("[data-ayah-num]");
        if (card) type = "translation";
      }

      // Walk up to find ayah/surah numbers
      let targetAyahNum: number | null = null;
      let targetSurahNum: number | null = null;
      let node: Node | null = startEl;
      while (node && node !== document.body) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (!targetAyahNum && el.getAttribute("data-ayah-num")) {
            targetAyahNum = parseInt(el.getAttribute("data-ayah-num") || "0", 10);
            targetSurahNum = parseInt(el.getAttribute("data-surah-num") || "0", 10);
            break;
          }
        }
        node = node.parentNode;
      }

      if (type && targetAyahNum) {
        setHighlightSelection({
          text,
          surahNumber: targetSurahNum || activeSurah,
          ayahNumber: targetAyahNum,
          type,
          x: rect.left + rect.width / 2,
          y: rect.top,          // viewport-relative; toolbar is position:fixed
          isExisting: false
        });
      }
    };

    const handleMarkClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'mark') {
        const text = target.textContent || "";
        const surahNum = parseInt(target.closest('[data-surah-num]')?.getAttribute('data-surah-num') || "0", 10);
        const ayahNum = parseInt(target.closest('[data-ayah-num]')?.getAttribute('data-ayah-num') || "0", 10);
        const rect = target.getBoundingClientRect();
        const id = target.getAttribute('data-id') || undefined;
        const color = (target.getAttribute('data-color') || 'gold') as import('@/components/tafsir/HighlightToolbar').HighlightColor;
        
        if (text && (surahNum || activeSurah) && ayahNum) {
          setHighlightSelection({
            id,
            text,
            surahNumber: surahNum || activeSurah,
            ayahNumber: ayahNum,
            type: "translation",
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            isExisting: true,
            color,
          });
        }
      }
    };

    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.highlight-popover') && target.tagName.toLowerCase() !== 'mark' && window.getSelection()?.isCollapsed) {
        setHighlightSelection(null);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    document.addEventListener("click", handleMarkClick);
    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("touchstart", handleGlobalClick);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
      document.removeEventListener("click", handleMarkClick);
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("touchstart", handleGlobalClick);
    };
  }, [activeSurah]);
  const [loadedTafsir, setLoadedTafsir] = useState<Record<number, TafsirEntry>>({});
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const tafsirCacheRef = useRef<Map<string, TafsirEntry[]>>(new Map());

  const [topNavVisible, setTopNavVisible] = useState<boolean>(true);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">("vertical");
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollYRef = useRef<number>(0);

  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);

  // Surah Context & Theme State
  const [showSurahContext, setShowSurahContext] = useState<boolean>(false);
  const [surahInfo, setSurahInfo] = useState<any>(null);

  // Ayah Wheel Picker Modal & Scroll Target State
  const [wheelModalOpen, setWheelModalOpen] = useState<boolean>(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);
  const [selectedAuthorForWheel, setSelectedAuthorForWheel] = useState<Author | null>(null);
  const [selectedLangForWheel, setSelectedLangForWheel] = useState<string>("");
  const [targetAyahToScroll, setTargetAyahToScroll] = useState<{ surah: number; ayah: number } | null>(() => {
    if (parsedUrlAyah && parsedUrlAyah > 0) {
      return { surah: parsedUrlSurahId, ayah: parsedUrlAyah };
    }
    return null;
  });
  const pendingScrollAyahRef = useRef<number | null>(parsedUrlAyah && parsedUrlAyah > 0 ? parsedUrlAyah : null);

  // Fetch Surah context & theme when surah or author changes
  useEffect(() => {
    if (activeAuthor && activeSurah > 0) {
      fetch(`/api/surah-info?surahId=${activeSurah}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setSurahInfo(data.data);
          }
        })
        .catch((e) => console.error("Failed to load surah context:", e));
    }
  }, [activeAuthor?.id, activeSurah]);

  // Fetch all languages & authors on mount
  useEffect(() => {
    setLoadingCatalog(true);
    fetch("/api/tafsir")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const sorted = [...data.data].sort((a, b) => {
            const rankA = getLanguagePriority(a.name);
            const rankB = getLanguagePriority(b.name);
            
            // If either language is one of the top 3 (English: 1, Arabic: 2, Urdu: 3), sort by priority rank
            if (rankA <= 3 || rankB <= 3) {
              if (rankA !== rankB) return rankA - rankB;
            }
            
            // Otherwise, sort descending by the number of Tafsir entries (authors count)
            const countA = Array.isArray(a.authors) ? a.authors.length : 0;
            const countB = Array.isArray(b.authors) ? b.authors.length : 0;
            if (countA !== countB) return countB - countA;
            
            // Final alphabetical sort if counts are equal
            return a.name.localeCompare(b.name);
          });
          setLanguages(sorted);
          
          // Auto-select author if deep linked
          if (urlAuthor) {
            const authorQuery = normalizeText(urlAuthor);
            let matchedAuthor = null;
            let matchedLang = "";
            for (const lang of sorted) {
              for (const author of lang.authors) {
                if (author.id.toString() === urlAuthor || normalizeText(author.name).includes(authorQuery) || (author.authorName && normalizeText(author.authorName).includes(authorQuery))) {
                  matchedAuthor = author;
                  matchedLang = lang.name;
                  break;
                }
              }
              if (matchedAuthor) break;
            }
            if (matchedAuthor) {
              setActiveAuthor(matchedAuthor);
              setActiveLangName(matchedLang);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to fetch languages:", err))
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, [urlAuthor]);

  // Load full Surah Tafsir in ONE single fast request and cache in memory
  const loadSurahTafsir = useCallback(async (authorId: number, surahId: number) => {
    const cacheKey = `${authorId}:${surahId}`;
    setLoadError(null);
    if (tafsirCacheRef.current.has(cacheKey)) {
      const cached = tafsirCacheRef.current.get(cacheKey)!;
      const map: Record<number, TafsirEntry> = {};
      cached.forEach((item, idx) => { map[idx] = item; });
      setLoadedTafsir(map);
      setLoadingEntries(false);
      return;
    }

    setLoadedTafsir({}); // Clear old tafsir immediately so previous language doesn't linger!
    setLoadingEntries(true);

    try {
      const res = await fetch(`/api/tafsir?authorId=${authorId}&surahId=${surahId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          setLoadError("No commentary entries found for this Surah in the selected edition.");
        } else {
          const map: Record<number, TafsirEntry> = {};
          data.data.forEach((entry: TafsirEntry, i: number) => {
            map[i] = entry;
          });
          setLoadedTafsir(map);
          tafsirCacheRef.current.set(cacheKey, data.data);
        }
      } else {
        setLoadError(data.error || "Failed to retrieve commentary for this Surah.");
      }
    } catch (e: any) {
      console.error(`[TafsirReader] Failed to load tafsir for author ${authorId}, surah ${surahId}:`, e);
      setLoadError("Unable to load commentary. Please check your connection or retry.");
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  // Fetch initial Tafsir when author or surah changes (with instant client cache)
  useEffect(() => {
    if (!activeAuthor) return;
    loadSurahTafsir(activeAuthor.id, activeSurah);
  }, [activeAuthor?.id, activeSurah, loadSurahTafsir]);

  // We use Virtuoso now for virtualization, no need for manual infinite scroll observer.

  // Flatten all authors with their language info: English first -> Arabic -> Urdu -> Others, then by fame rank
  const allAuthorsWithLang = useMemo(() => {
    const list: { author: Author; language: Language }[] = [];
    languages.forEach((lang) => {
      lang.authors.forEach((auth) => {
        list.push({ author: auth, language: lang });
      });
    });

    return list.sort((a, b) => {
      const langRankA = getLanguagePriority(a.language.name);
      const langRankB = getLanguagePriority(b.language.name);
      if (langRankA !== langRankB) return langRankA - langRankB;

      const fameRankA = getTafsirFameRank(a.author.name, a.author.authorName);
      const fameRankB = getTafsirFameRank(b.author.name, b.author.authorName);
      if (fameRankA !== fameRankB) return fameRankA - fameRankB;

      return a.author.name.localeCompare(b.author.name);
    });
  }, [languages]);

  // Filter authors based on search query, language, era, and difficulty selection
  const filteredAuthors = useMemo(() => {
    const base = allAuthorsWithLang.filter(({ author, language }) => {
      const matchesLang =
        selectedLanguage === "All" ||
        language.name.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesEra =
        selectedEra === "All Eras" ||
        author.era === selectedEra;
      const matchesDifficulty =
        selectedDifficulty === "All Levels" ||
        author.difficulty === selectedDifficulty;
      return matchesLang && matchesEra && matchesDifficulty;
    });

    return filterTafsirs(searchQuery, base);
  }, [allAuthorsWithLang, selectedLanguage, selectedEra, selectedDifficulty, searchQuery]);

  const currentSurahMeta = SURAHS_DATA.find((s) => s.number === activeSurah) || SURAHS_DATA[0];

  // Handle URL params: navigate to author's surah/ayah on mount if params present
  useEffect(() => {
    if (urlSurah) {
      const n = parseInt(urlSurah, 10);
      if (!isNaN(n) && n >= 1 && n <= 114) setActiveSurah(n);
    }
  }, [urlSurah]);

  useEffect(() => {
    if (urlAyah) {
      const a = parseInt(urlAyah, 10);
      if (!isNaN(a) && a >= 1) {
        setTargetAyahToScroll({ surah: activeSurah, ayah: a });
        pendingScrollAyahRef.current = a;
      }
    }
  }, [urlAyah, activeSurah]);



  // Scroll behavior: headroom hide-on-scroll top nav across modes
  useEffect(() => {
    setTopNavVisible(true);

    const onScroll = () => {
      const scrollTop = window.scrollY;

      // Hide top nav when scrolling down, show when scrolling up
      if (scrollTop > lastScrollYRef.current && scrollTop > 50) {
        setTopNavVisible(false);
      } else if (scrollTop < lastScrollYRef.current) {
        setTopNavVisible(true);
      }
      lastScrollYRef.current = scrollTop;
    };
    
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [activeAuthor]);

  const currentAyahIndexRef = useRef<number>(currentAyahIndex);
  useEffect(() => {
    currentAyahIndexRef.current = currentAyahIndex;
  }, [currentAyahIndex]);

  const isNavigatingRef = useRef(false);
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToAyah = useCallback((num: number, forceInstant?: boolean) => {
    const targetIdx = Math.max(0, num - 1);
    setCurrentAyahIndex(targetIdx);

    // Lock navigation so rangeChanged doesn't overwrite currentAyahIndex during scroll
    isNavigatingRef.current = true;
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);

    // 1. Center the tracker button inside the right sidebar WITHOUT scrolling window
    const trackerEl = document.getElementById(`ayah-tracker-${num}`);
    if (trackerEl) {
      const asideEl = trackerEl.closest("aside");
      if (asideEl) {
        const asideRect = asideEl.getBoundingClientRect();
        const elRect = trackerEl.getBoundingClientRect();
        const relativeTop = elRect.top - asideRect.top + asideEl.scrollTop;
        asideEl.scrollTo({
          top: relativeTop - asideEl.clientHeight / 2 + trackerEl.clientHeight / 2,
          behavior: "smooth",
        });
      }
    }

    if (readingMode === "horizontal") return;

    // 2. Scroll the main reading commentary view
    const distance = Math.abs(targetIdx - currentAyahIndexRef.current);
    const useSmooth = !forceInstant && distance <= 3;
    const behavior: ScrollBehavior = useSmooth ? "smooth" : "auto";

    const existingCard = document.getElementById(`ayah-${num}`);
    if (existingCard) {
      existingCard.scrollIntoView({ behavior, block: "start" });
    } else {
      virtuosoRef.current?.scrollToIndex({
        index: targetIdx,
        align: "start",
        behavior: "auto",
      });

      let attempts = 0;
      const maxAttempts = 16;
      const ensureCardAligned = () => {
        attempts++;
        const cardEl = document.getElementById(`ayah-${num}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts < maxAttempts) {
          setTimeout(ensureCardAligned, 50);
        }
      };
      requestAnimationFrame(ensureCardAligned);
    }
  }, [readingMode]);

  // Keep the right sidebar tracker centered on the current ayah during manual scrolling
  useEffect(() => {
    if (isNavigatingRef.current) return;
    const num = currentAyahIndex + 1;
    const trackerEl = document.getElementById(`ayah-tracker-${num}`);
    if (trackerEl) {
      const asideEl = trackerEl.closest("aside");
      if (asideEl) {
        const asideRect = asideEl.getBoundingClientRect();
        const elRect = trackerEl.getBoundingClientRect();
        const relativeTop = elRect.top - asideRect.top + asideEl.scrollTop;
        asideEl.scrollTo({
          top: relativeTop - asideEl.clientHeight / 2 + trackerEl.clientHeight / 2,
          behavior: "smooth",
        });
      }
    }
  }, [currentAyahIndex]);

  const handleSelectTopicAyahInTafsir = useCallback((ayahNum: number) => {
    scrollToAyah(ayahNum, false);
    setTimeout(() => {
      const cardEl = document.getElementById(`ayah-${ayahNum}`);
      if (cardEl) {
        cardEl.classList.add("ring-2", "ring-accent", "bg-accent/10");
        setTimeout(() => {
          cardEl.classList.remove("ring-2", "ring-accent", "bg-accent/10");
        }, 3000);
      }
    }, 200);
  }, [scrollToAyah]);

  const { setImmersiveMode } = useGlobalState();

  // Hide mobile bottom nav when in Tafsir reading mode
  useEffect(() => {
    if (activeAuthor) {
      setImmersiveMode(true);
    } else {
      setImmersiveMode(false);
    }
    return () => {
      setImmersiveMode(false);
    };
  }, [activeAuthor, setImmersiveMode]);

  // When async loading completes or targetAyahToScroll changes, scroll to target ayah
  useEffect(() => {
    const targetAyah = targetAyahToScroll?.ayah || pendingScrollAyahRef.current;
    if (!targetAyah || targetAyah <= 0) return;
    if (loadingEntries || Object.keys(loadedTafsir).length === 0) return;

    if (targetAyahToScroll && targetAyahToScroll.surah !== activeSurah) return;

    scrollToAyah(targetAyah, true);
    setTargetAyahToScroll(null);
    pendingScrollAyahRef.current = null;
  }, [loadingEntries, loadedTafsir, targetAyahToScroll, activeSurah, scrollToAyah]);

  const prevSurahRef = useRef<number>(activeSurah);
  // Reset to Verse 1 at the top of the page when changing Surah (unless a target ayah was selected)
  useEffect(() => {
    if (prevSurahRef.current !== activeSurah) {
      prevSurahRef.current = activeSurah;
      setShowSurahContext(false);
      if (!targetAyahToScroll && !pendingScrollAyahRef.current) {
        setCurrentAyahIndex(0);
        virtuosoRef.current?.scrollToIndex({ index: 0, align: "start", behavior: "auto" });
        window.scrollTo({ top: 0, behavior: "smooth" });
        const trackerEl = document.getElementById(`ayah-tracker-1`);
        if (trackerEl) {
          const asideEl = trackerEl.closest("aside");
          if (asideEl) {
            asideEl.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      }
    }
  }, [activeSurah, targetAyahToScroll]);

  // Auto-scroll the left sidebar Surah selector to the active Surah
  useEffect(() => {
    if (activeAuthor && activeSurah > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`tafsir-surah-${activeSurah}`);
        if (el) {
          const asideEl = el.closest("aside");
          if (asideEl) {
            const asideRect = asideEl.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const relativeTop = elRect.top - asideRect.top + asideEl.scrollTop;
            asideEl.scrollTo({
              top: relativeTop - asideEl.clientHeight / 2 + el.clientHeight / 2,
              behavior: "smooth",
            });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeSurah, activeAuthor]);

  // Save Last Read tracking whenever reading position changes
  useEffect(() => {
    if (activeAuthor && activeSurah > 0) {
      const ayahNum = currentAyahIndex + 1;
      setLastReadTafsir({
        surahId: activeSurah,
        surahName: currentSurahMeta.englishName,
        ayahNumber: ayahNum,
        authorId: activeAuthor.id,
        authorName: activeAuthor.name,
        langName: activeLangName,
        timestamp: Date.now(),
      });
    }
  }, [activeAuthor, activeSurah, currentAyahIndex, currentSurahMeta.englishName, activeLangName]);

  const navigateAyah = useCallback((delta: number) => {
    const nextIdx = Math.max(0, Math.min(currentSurahMeta.numberOfAyahs - 1, currentAyahIndex + delta));
    scrollToAyah(nextIdx + 1);
  }, [currentAyahIndex, currentSurahMeta.numberOfAyahs, scrollToAyah]);


  // ==========================================
  // FULL READING MODE (WHEN AUTHOR IS SELECTED)
  // ==========================================
  if (activeAuthor) {
    const isArabicOrUrdu =
      activeLangName.toLowerCase().includes("arabic") ||
      activeLangName.toLowerCase().includes("urdu") ||
      activeLangName.toLowerCase().includes("persian");
      
    const isUrduText = activeLangName.toLowerCase().includes("urdu");

    const authorWarning = getTafsirWarning(activeAuthor.name, activeAuthor.authorName);

    return (
      <div
        className={cn(
          "w-full max-w-full overflow-x-clip bg-background text-foreground transition-colors touch-pan-y",
          inter.className,
          readingMode === "horizontal" ? "h-screen overflow-hidden flex flex-col" : "min-h-screen"
        )}
      >
        {highlightModeStyle}
        {/* Top Navigation Bar (Mobile Only) */}
        <div className={`md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-3 py-2.5 transition-all duration-300 ${topNavVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
          <div className="max-w-[1700px] mx-auto">
            {/* Top Row: Back, Tafsir Selector Dropdown, Ayah Picker, Theme Toggle */}
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Left Side: Back button + Tafsir Selector */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  onClick={() => setActiveAuthor(null)}
                  className="flex items-center justify-center p-2 rounded-lg bg-card border border-border hover:bg-muted text-sm font-medium transition-all text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title="All Tafsirs"
                >
                  <ArrowLeft className="size-4" />
                </button>
                
                <div className="relative flex-1 min-w-0">
                  <select
                    value={activeAuthor.id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const match = allAuthorsWithLang.find((a) => a.author.id === id);
                      if (match) {
                        setActiveAuthor(match.author);
                        setActiveLangName(match.language.name);
                      }
                    }}
                    className="w-full appearance-none bg-card hover:bg-muted border border-border rounded-lg pl-2.5 pr-7 py-1.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring truncate cursor-pointer transition-colors"
                    title="Switch Tafsir"
                  >
                    {allAuthorsWithLang.map(({ author, language }) => (
                      <option key={`${language.id}-${author.id}`} value={author.id} className="bg-card text-foreground">
                        {author.name.replace(/\s*\([^)]*\)\s*$/, "").trim()} · {language.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Right Side: Topics Button, Ayah Picker Button, Book Mode Toggle & Theme Toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setIsTopicModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all shrink-0 cursor-pointer"
                  title="Search topics & subjects in this Tafsir"
                >
                  <Search className="size-3.5 text-accent" />
                  <span className="hidden xs:inline">Topics</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedAuthorForWheel(activeAuthor);
                    setSelectedLangForWheel(activeLangName);
                    setWheelModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all shrink-0 cursor-pointer"
                  title="Ayah Picker"
                >
                  <Compass className="size-3.5 text-accent" />
                  <span className="hidden xs:inline">Picker</span>
                </button>
                <ThemeToggleButton />
              </div>
            </div>

            {/* Bottom Row (Mobile Only): Surah & Ayah Pickers */}
            <div className="md:hidden flex gap-2 w-full mt-2.5">
              <div className="relative flex-1 min-w-0">
                <select
                  value={activeSurah}
                  onChange={(e) => setActiveSurah(Number(e.target.value))}
                  className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring pr-8 truncate"
                >
                  {SURAHS_DATA.map((s) => (
                    <option key={s.number} value={s.number} className="bg-card text-foreground">
                      {s.number}. {s.englishName}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none rotate-90" />
              </div>

              <div className="relative w-24 shrink-0">
                <select
                  value={currentAyahIndex + 1}
                  onChange={(e) => scrollToAyah(Number(e.target.value))}
                  className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                >
                  {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num} className="bg-card text-foreground">
                      Ayah {num}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none rotate-90" />
              </div>
            </div>
          </div>
        </div>
        {/* Layout: Sidebar + Main Content + Right Ayah Navigator */}
        <div className={cn("w-full flex min-h-screen transition-all duration-300", aiChatContext ? "lg:pr-[420px] xl:pr-[450px]" : "")}>
          {/* Left Sidebar: 114 Surahs */}
          <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-border bg-background sticky top-0 h-screen overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-border sticky top-0 bg-background z-10 flex flex-col gap-4">
              {/* Tafsir Header Info */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setActiveAuthor(null)}
                  className="flex items-center justify-center p-2 rounded-lg bg-card border border-border hover:bg-muted transition-all text-muted-foreground hover:text-foreground shrink-0"
                  title="Back to All Tafsirs"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex flex-col min-w-0 justify-center py-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="text-sm font-bold text-foreground leading-snug break-words">
                      {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                    </h1>
                    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-sm bg-accent/10 border border-accent/20 text-accent font-semibold uppercase tracking-wider shrink-0">
                      {activeLangName}
                    </span>
                  </div>
                  {activeAuthor.authorName && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {activeAuthor.authorName}
                    </p>
                  )}
                </div>
              </div>

              <select
                value={activeAuthor.id}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const match = allAuthorsWithLang.find((a) => a.author.id === id);
                  if (match) {
                    setActiveAuthor(match.author);
                    setActiveLangName(match.language.name);
                  }
                }}
                className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                title="Switch tafsir"
              >
                {allAuthorsWithLang.map(({ author, language }) => (
                  <option key={`${language.id}-${author.id}`} value={author.id}>
                    {author.name.replace(/\s*\([^)]*\)\s*$/, "").trim()} · {language.name}
                  </option>
                ))}
              </select>

              {/* Sidebar Header */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate min-w-0 flex-1">
                  Surahs (1 - 114)
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Topics Button */}
                  <button
                    onClick={() => setIsTopicModalOpen(true)}
                    className="h-7 px-2 rounded-lg border border-border bg-card/60 hover:bg-muted text-xs font-medium text-foreground transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Search topics & subjects in this Tafsir"
                  >
                    <Search className="size-3.5 text-accent" />
                    <span>Topics</span>
                  </button>
                  {/* Ayah Picker */}
                  <button
                    onClick={() => {
                      setSelectedAuthorForWheel(activeAuthor);
                      setSelectedLangForWheel(activeLangName);
                      setWheelModalOpen(true);
                    }}
                    className="h-7 px-2.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-xs font-medium text-foreground transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Open Ayah Picker"
                  >
                    <Compass className="size-3.5 text-accent" />
                    <span>Ayah Picker</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {SURAHS_DATA.map((surah) => {
                const isActive = surah.number === activeSurah;
                return (
                  <button
                    key={surah.number}
                    id={`tafsir-surah-${surah.number}`}
                    onClick={() => {
                      setActiveSurah(surah.number);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onMouseEnter={() => {
                      if (activeAuthor) {
                        const key = `${activeAuthor.id}:${surah.number}`;
                        if (!tafsirCacheRef.current.has(key)) {
                          fetch(`/api/tafsir?authorId=${activeAuthor.id}&surahId=${surah.number}`)
                            .then(r => r.json())
                            .then(d => {
                              if (d.success && Array.isArray(d.data)) {
                                tafsirCacheRef.current.set(key, d.data);
                              }
                            })
                            .catch(() => {});
                        }
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-muted border border-border text-foreground"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-6 rounded-md flex items-center justify-center text-xs font-bold ${isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                        {surah.number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{surah.englishName}</span>
                        <span className="text-[11px] text-muted-foreground">{surah.englishNameTranslation}</span>
                      </div>
                    </div>
                    <span className={`${amiriquran.className} text-base text-reading`}>{surah.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area */}
          <main
            className={cn(
              "flex-1 w-full min-w-0 transition-all duration-300 mx-auto",
              readingMode === "horizontal"
                ? "h-full flex flex-col p-2 sm:p-4 max-w-5xl overflow-hidden space-y-2"
                : "p-4 md:p-8 space-y-8 max-w-3xl overflow-x-clip"
            )}
          >

            {authorWarning.hasWarning && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 sm:p-4 flex gap-3 text-amber-200 text-xs sm:text-sm shrink-0">
                <Sparkles className="size-4 sm:size-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-400 mb-0.5">Methodological Note</h4>
                  <p>{authorWarning.message}</p>
                </div>
              </div>
            )}

            {/* Surah Banner Header */}
            {readingMode === "horizontal" ? (
              <div className="shrink-0 flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-border bg-card/70 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mushaf-uthmani text-accent text-xl leading-none shrink-0">
                    {currentSurahMeta.name}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {currentSurahMeta.number}. {currentSurahMeta.englishName} ({currentSurahMeta.englishNameTranslation})
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {currentSurahMeta.revelationType} • {currentSurahMeta.numberOfAyahs} Ayahs
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowSurahContext(!showSurahContext)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent text-[11px] font-semibold cursor-pointer transition-colors"
                    title={showSurahContext ? "Hide Context" : "Read Surah Context and Theme"}
                  >
                    <Compass size={13} className="text-accent" />
                    <span className="hidden sm:inline">{showSurahContext ? "Close Context" : "Context & Theme"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={cn(
                "relative rounded-xl border border-border bg-card transition-all duration-300 overflow-hidden",
                aiChatContext ? "p-4 sm:p-5" : "p-4 sm:p-6"
              )}>
                <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-accent/10 blur-3xl" />
                <div className={cn(
                  "relative z-10 min-w-0 transition-all flex flex-col items-center justify-center text-center gap-2",
                  aiChatContext ? "gap-2" : "gap-3"
                )}>
                  <div className="min-w-0 flex-1 flex flex-col items-center">
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-accent mb-1">
                      <span>Surah {currentSurahMeta.number}</span>
                      <span>•</span>
                      <span>{currentSurahMeta.revelationType}</span>
                      <span>•</span>
                      <span>{currentSurahMeta.numberOfAyahs} Ayahs</span>
                    </div>
                    <h2 className={cn(
                      "font-extrabold text-foreground leading-tight transition-all [word-break:break-word] text-center",
                      aiChatContext ? "text-base sm:text-lg" : "text-lg sm:text-xl lg:text-2xl xl:text-3xl"
                    )}>
                      {currentSurahMeta.englishName} ({currentSurahMeta.englishNameTranslation})
                    </h2>
                  </div>
                  <div className="shrink-0 transition-all mt-1">
                    <h3 className={cn(
                      "font-mushaf-uthmani text-accent leading-relaxed transition-all text-center",
                      aiChatContext ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl xl:text-[2.75rem]"
                    )}>
                      {currentSurahMeta.name}
                    </h3>
                  </div>
                </div>

                {/* Context & Theme Button */}
                <div className="mt-3 flex flex-col items-center w-full max-w-3xl mx-auto">
                  <button
                    onClick={() => setShowSurahContext(!showSurahContext)}
                    className="group relative inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/40 hover:bg-accent/15 hover:border-accent cursor-pointer transition-colors"
                    title={showSurahContext ? "Hide Context" : "Read Surah Context and Theme"}
                  >
                    <Compass size={14} className="text-accent relative z-10" />
                    <span className="text-[11px] md:text-[12px] font-bold tracking-widest text-accent group-hover:text-foreground transition-colors uppercase relative z-10">
                      {showSurahContext ? "Close Context" : "Context & Theme"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Context & Theme Popover / Drawer Content */}
            {showSurahContext && surahInfo && (
              <div className={cn(
                "p-5 sm:p-6 w-full rounded-2xl bg-popover border border-accent/40 text-sm text-foreground relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 text-left",
                readingMode === "horizontal" ? "max-h-60 overflow-y-auto custom-scrollbar shrink-0" : "mt-4"
              )}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent"></div>
                
                <div className="font-semibold text-accent uppercase tracking-wider text-[11px] mb-5 border-b border-accent/20 pb-3 flex items-center justify-between">
                  <span className="text-accent font-bold uppercase tracking-wider text-[12px] flex items-center gap-2">
                    <Compass size={15} />
                    CONTEXT & THEME OF {currentSurahMeta.englishName.toUpperCase()} ({currentSurahMeta.name})
                  </span>
                  <button 
                    onClick={() => setShowSurahContext(false)} 
                    className="hover:bg-muted p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span className="sr-only">Close</span>
                    <X size={16} />
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

            <div className={cn("flex-1 w-full min-h-0", readingMode === "horizontal" && "flex flex-col overflow-hidden")}>
              {loadError ? (
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center my-12 border border-border/40 rounded-2xl bg-card/40 backdrop-blur max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Commentary Unavailable</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{loadError}</p>
                  <button
                    onClick={() => activeAuthor && loadSurahTafsir(activeAuthor.id, activeSurah)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent/10 border border-accent/40 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry Loading
                  </button>
                </div>
              ) : loadingEntries || Object.keys(loadedTafsir).length === 0 || (loadedTafsir[0] && loadedTafsir[0].authorId !== activeAuthor.id) ? (
                <AlJuthurLoadingProgress
                  title={`Loading ${activeAuthor?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || "Tafsir"}`}
                  subtitle={`Surah ${currentSurahMeta.englishName} (${activeLangName || "Scholarly Exegesis"})`}
                  statusMessages={[
                    "Retrieving authentic classical exegesis...",
                    "Cross-referencing scholarly commentary & notes...",
                    "Preparing typography & structured annotations..."
                  ]}
                  minDurationMs={400}
                />
              ) : readingMode === "horizontal" ? (
                <TafsirHorizontalReader
                  currentAyahIndex={currentAyahIndex}
                  totalAyahs={currentSurahMeta.numberOfAyahs}
                  onAyahChange={(idx) => scrollToAyah(idx + 1)}
                  activeSurah={activeSurah}
                  activeLangName={activeLangName}
                  currentSurahMeta={currentSurahMeta}
                >
                  {loadedTafsir[currentAyahIndex] ? (
                    <TafsirCard 
                      key={loadedTafsir[currentAyahIndex].id || currentAyahIndex}
                      entry={loadedTafsir[currentAyahIndex]} 
                      idx={currentAyahIndex} 
                      activeSurah={activeSurah} 
                      activeLangName={activeLangName} 
                      activeAuthor={activeAuthor} 
                      aiChatContext={aiChatContext} 
                      scrollToAyah={scrollToAyah}
                      languages={languages}
                      highlights={highlights}
                      notes={notes}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground text-sm">
                      Loading commentary...
                    </div>
                  )}
                </TafsirHorizontalReader>
              ) : (
                <Virtuoso
                  ref={virtuosoRef}
                  useWindowScroll
                  totalCount={currentSurahMeta.numberOfAyahs}
                  defaultItemHeight={600}
                  overscan={{ main: 1000, reverse: 600 }}
                  increaseViewportBy={{ top: 600, bottom: 600 }}
                  initialTopMostItemIndex={parsedUrlAyah && parsedUrlAyah > 0 ? Math.max(0, parsedUrlAyah - 1) : 0}
                  rangeChanged={({ startIndex }) => {
                    if (isNavigatingRef.current) return;
                    if (typeof startIndex === "number" && startIndex >= 0) {
                      setCurrentAyahIndex(startIndex);
                    }
                  }}
                  itemContent={(idx) => {
                    const entry = loadedTafsir[idx];
                    if (!entry) {
                      return (
                        <div key={`skeleton-${idx}`} className="border border-border bg-card/50 rounded-xl p-6 pb-6 animate-pulse flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-border pb-3">
                            <div className="w-20 h-6 bg-muted rounded-lg" />
                            <div className="w-16 h-6 bg-muted/80 rounded" />
                          </div>
                          <div className="w-full h-12 bg-muted/60 rounded-lg" />
                          <div className="space-y-2 mt-2">
                            <div className="w-full h-4 bg-muted/40 rounded" />
                            <div className="w-5/6 h-4 bg-muted/40 rounded" />
                            <div className="w-3/4 h-4 bg-muted/30 rounded" />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <TafsirCard 
                        key={entry.id || idx}
                        entry={entry}
                        idx={idx}
                        activeSurah={activeSurah}
                        activeLangName={activeLangName}
                        activeAuthor={activeAuthor}
                        aiChatContext={aiChatContext}
                        scrollToAyah={scrollToAyah}
                        languages={languages}
                        highlights={highlights}
                        notes={notes}
                      />
                    );
                  }}
                />
              )}
            </div>
          </main>

          {/* Right Sidebar: Compact Ayah Jump Index */}
          <aside className={cn("flex-col items-center w-16 lg:w-20 shrink-0 border-l border-border bg-background/50 sticky top-0 h-screen overflow-y-auto no-scrollbar pt-3.5 pb-28", aiChatContext ? "hidden xl:flex" : "hidden md:flex")}>
            <div className="mb-4 shrink-0">
              <ThemeToggleButton />
            </div>
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest text-center mb-3">Ayahs</div>
            <div className="flex flex-col items-center gap-2 pb-24">
              {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => {
                const isCurrent = num === currentAyahIndex + 1;
                return (
                  <button
                    key={num}
                    id={`ayah-tracker-${num}`}
                    onClick={() => scrollToAyah(num)}
                    className={cn(
                      "size-8 lg:size-9 rounded-full flex items-center justify-center text-[10px] lg:text-[11px] font-semibold transition-all shrink-0 border border-transparent cursor-pointer",
                      isCurrent
                        ? "bg-accent text-accent-foreground font-bold shadow-lg shadow-sm scale-110"
                        : "text-muted-foreground hover:bg-accent/15 hover:text-accent"
                    )}
                    title={`Jump to Ayah ${num}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>

        <AyahChatSidebar
          surahNumber={aiChatContext?.surah || 0}
          ayahNumber={aiChatContext?.ayah || 0}
          isOpen={!!aiChatContext}
          onClose={() => setAiChatContext(null)}
          initialModeId="default"
        />

        <FloatingAskScholarButton
          onClick={() => setAiChatContext({ surah: activeSurah, ayah: currentAyahIndex + 1 })}
          label="Ask AI"
          isVisible={!aiChatContext}
          className="bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 md:right-[calc(4rem+1.25rem)] lg:right-[calc(5rem+1.5rem)]"
        />

        <AyahNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => { setIsNoteModalOpen(false); setNoteSelectedText(""); }}
          surahNumber={activeSurah}
          ayahNumber={currentAyahIndex + 1}
          selectedText={noteSelectedText}
          onSave={(saved) => setNotes(prev => [...prev, saved])}
        />

        {!aiChatContext && (
          <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 md:left-[calc(16rem+1.25rem)] lg:left-[calc(18rem+1.5rem)] z-40 flex flex-col items-start gap-3 transition-all duration-200">

            {/* Highlight Tips Tooltip */}
            {isToolsMenuOpen && (
              <div className="w-64 p-4 bg-card border border-border shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-4 zoom-in-95">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Highlighter className="size-4 text-accent" />
                    Highlights & Notes
                  </div>
                  <button onClick={() => setIsToolsMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-accent font-bold text-[10px]">1</span>
                    </div>
                    <p><strong className="text-foreground">Select any text</strong> in the tafsir with your cursor or finger to bring up the toolbar.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-accent font-bold text-[10px]">2</span>
                    </div>
                    <p>Pick a <strong className="text-foreground">highlight color</strong> — it's saved permanently to your library.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-accent font-bold text-[10px]">3</span>
                    </div>
                    <p>Tap the <strong className="text-foreground">Note</strong> button to write a reflection anchored to that text.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-accent font-bold text-[10px]">4</span>
                    </div>
                    <p><strong className="text-foreground">Tap any highlight</strong> to re-color or remove it.</p>
                  </div>
                </div>
              </div>
            )}

            {/* FAB Button */}
            <button
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={cn(
                "flex items-center justify-center size-12 rounded-full border border-border backdrop-blur-xl shadow-md transition-all duration-200 cursor-pointer",
                isToolsMenuOpen
                  ? "border-accent text-accent ring-2 ring-accent/20 bg-card/90"
                  : "bg-card/90 text-foreground hover:border-accent/40 hover:text-accent hover:bg-muted"
              )}
              title="Highlight & Note Tips"
            >
              {isToolsMenuOpen ? <X className="size-5" /> : <PenTool className="size-5" />}
            </button>
          </div>
        )}

        <AyahWheelPickerModal
          isOpen={wheelModalOpen}
          onClose={() => setWheelModalOpen(false)}
          tafsirName={selectedAuthorForWheel ? selectedAuthorForWheel.name : activeAuthor ? activeAuthor.name : undefined}
          initialSurah={activeSurah}
          initialAyah={currentAyahIndex + 1}
          onSelectPassage={(surahNum, ayahNum) => {
            if (selectedAuthorForWheel) {
              setActiveAuthor(selectedAuthorForWheel);
              setActiveLangName(selectedLangForWheel);
              setSelectedAuthorForWheel(null);
            }
            setActiveSurah(surahNum);
            setTargetAyahToScroll({ surah: surahNum, ayah: ayahNum });
            pendingScrollAyahRef.current = ayahNum;
          }}
        />

        <TopicSearchModal
          isOpen={isTopicModalOpen}
          onClose={() => setIsTopicModalOpen(false)}
          mode="tafsir"
          surahId={activeSurah}
          surahName={currentSurahMeta?.englishName || `Surah ${activeSurah}`}
          authorName={activeAuthor?.name}
          loadedTafsir={loadedTafsir}
          onSelectAyah={(ayahNum: number) => handleSelectTopicAyahInTafsir(ayahNum)}
        />

        {/* Highlight toolbar - renders via portal above selected text */}
        <HighlightToolbar
          selection={highlightSelection}
          onHighlight={async (color: HighlightColor) => {
            if (!highlightSelection) return;
            const { text, surahNumber, ayahNumber, type, id } = highlightSelection;
            if (id || highlightSelection.isExisting) {
              const match = highlights.find(h => h.id === id || (h.text === text && h.surahId === surahNumber && h.ayahNumber === ayahNumber));
              if (match) {
                await deleteUserHighlight(match.id);
                setHighlights(prev => prev.filter(h => h.id !== match.id));
              }
            }
            const authorStr = type === 'translation' && (activeAuthor as any)?.authorName ? (activeAuthor as any).authorName : undefined;
            const res = await saveUserHighlight(surahNumber, ayahNumber, text, type, authorStr, color);
            if (res) { toast.success("Highlight saved."); setHighlights(prev => [...prev, res]); }
            else toast.error("Failed to save highlight.");
            setHighlightSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onDelete={async () => {
            if (!highlightSelection) return;
            const { text, surahNumber, ayahNumber, id } = highlightSelection;
            const match = highlights.find(h => h.id === id || (h.text === text && h.surahId === surahNumber && h.ayahNumber === ayahNumber));
            if (match) {
              const success = await deleteUserHighlight(match.id);
              if (success) { toast.success("Highlight removed."); setHighlights(prev => prev.filter(h => h.id !== match.id)); }
              else toast.error("Failed to remove highlight.");
            }
            setHighlightSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onNote={() => {
            if (!highlightSelection) return;
            setNoteSelectedText(highlightSelection.text);
            setIsNoteModalOpen(true);
            setHighlightSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onCopy={() => {
            if (!highlightSelection) return;
            copyToClipboard(highlightSelection.text, "Copied to clipboard!");
            setHighlightSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onShare={() => {
            if (!highlightSelection) return;
            if (navigator.share) {
              navigator.share({ title: 'Al-Juthur Tafsir', text: highlightSelection.text }).catch(console.error);
            } else copyToClipboard(highlightSelection.text, "Copied to clipboard!");
            setHighlightSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          onClose={() => { setHighlightSelection(null); window.getSelection()?.removeAllRanges(); }}
        />
      </div>
    );
  }

  // ==========================================
  // TAFSIR LIBRARY VIEW (GRID OF COLLECTION CARDS)
  // ==========================================
  return (
    <div className={`min-h-screen bg-background text-foreground pb-36 md:pb-24 ${inter.className}`}>
      
      <AppHeader />

      {/* Hero Header removed for cleaner UI consistency */}

      {/* Sticky Filters & Search (Action Bar) */}
      <div className={`sticky z-30 bg-background/90 backdrop-blur-md border-y border-border mb-4 transition-all duration-300 top-0 mt-0`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          
          {/* Action Row: Search, Refine, Active Chips */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
            
            {/* Left side: Title + Active Chips */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <Library className="size-5 text-accent" />
                <span className="font-semibold text-foreground text-base md:text-lg">Tafsir Library</span>
              </div>
              
              {/* Active Filter Feedback Chips */}
              {(selectedEra !== "All Eras" || selectedDifficulty !== "All Levels") && (
                <div className="flex flex-wrap items-center gap-2 md:pl-2">
                  {selectedEra !== "All Eras" && (
                    <button 
                      onClick={() => setSelectedEra("All Eras")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs font-medium text-reading hover:text-foreground hover:bg-muted transition-colors group"
                    >
                      {selectedEra.replace(" & Contemporary", "")}
                      <X className="size-3 text-muted-foreground group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                  {selectedDifficulty !== "All Levels" && (
                    <button 
                      onClick={() => setSelectedDifficulty("All Levels")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs font-medium text-reading hover:text-foreground hover:bg-muted transition-colors group"
                    >
                      {selectedDifficulty}
                      <X className="size-3 text-muted-foreground group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedEra("All Eras");
                      setSelectedDifficulty("All Levels");
                    }}
                    className="text-[10px] text-muted-foreground hover:text-reading ml-1 underline decoration-border underline-offset-2 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Search and Refine */}
            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0">
              <div ref={searchContainerRef} className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tafsirs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-9 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                
                {/* Autocomplete Dropdown */}
                {isSearchFocused && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredAuthors.length > 0 ? (
                      <div className="p-1.5 flex flex-col gap-1">
                        {filteredAuthors.slice(0, 10).map(({ author, language }) => (
                          <button
                            key={`suggest-${language.id}-${author.id}`}
                            onClick={() => {
                              setSearchQuery(author.name);
                              setSelectedLanguage("All");
                              setIsSearchFocused(false);
                            }}
                            className="flex flex-col text-left px-3 py-2 hover:bg-accent/10 rounded-lg transition-colors w-full cursor-pointer"
                          >
                            <span className="text-sm font-semibold text-foreground">{author.name}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {author.authorName && <span>{author.authorName} • </span>}
                              <span className="text-accent font-medium">{language.name}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">No matches found</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {/* Mobile Saved Library button (commented out for Approach 3)
                <Link
                  href="/saved"
                  className="md:hidden flex items-center justify-center p-2 rounded-xl bg-card/90 border border-accent/30 text-accent hover:bg-muted transition"
                  title="Saved Library"
                >
                  <Bookmark className="size-4" />
                </Link>
                */}

                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      isFilterPanelOpen || selectedEra !== "All Eras" || selectedDifficulty !== "All Levels"
                        ? "bg-accent/10 border-accent/40 text-accent"
                        : "bg-card/90 border-accent/30 text-muted-foreground hover:text-accent hover:border-accent/50"
                    }`}
                  >
                    <Filter className="size-4" />
                    <span className="text-sm font-semibold hidden sm:inline">Refine</span>
                    {(selectedEra !== "All Eras" || selectedDifficulty !== "All Levels") && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                      </span>
                    )}
                  </button>
                  
                  {/* Desktop Filter Popover */}
                  {isFilterPanelOpen && (
                    <div className="hidden md:block">
                      <div className="fixed inset-0 z-[70]" onClick={() => setIsFilterPanelOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-[420px] bg-card border border-border shadow-2xl z-[80] rounded-2xl p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                            <Filter className="size-4 text-accent" /> Filter Tafsirs
                          </h3>
                          <button onClick={() => setIsFilterPanelOpen(false)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <X className="size-4" />
                          </button>
                        </div>

                        {/* Era Selection inside Panel */}
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <BookOpen className="size-3.5 text-accent" /> Era
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ERAS.map((eraName) => {
                              const count = eraName === "All Eras" 
                                ? allAuthorsWithLang.length 
                                : allAuthorsWithLang.filter(a => a.author.era === eraName).length;
                              return (
                                <button
                                  key={eraName}
                                  onClick={() => setSelectedEra(eraName)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    selectedEra === eraName
                                      ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
                                  }`}
                                >
                                  {eraName.replace(" & Contemporary", "")} <span className="opacity-60 ml-0.5">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Difficulty Selection inside Panel */}
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="size-3.5 text-accent" /> Difficulty
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {["All Levels", "Beginner", "Intermediate", "Advanced"].map((level) => {
                              const count = level === "All Levels" 
                                ? allAuthorsWithLang.length 
                                : allAuthorsWithLang.filter(a => a.author.difficulty === level).length;
                              return (
                                <button
                                  key={level}
                                  onClick={() => setSelectedDifficulty(level)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    selectedDifficulty === level
                                      ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                                      : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
                                  }`}
                                >
                                  {level} <span className="opacity-60 ml-0.5">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Filter Sheet (rendered via createPortal directly into document.body to avoid sticky/backdrop-filter containing block bugs) */}
                  {mounted && isFilterPanelOpen && createPortal(
                    <div className="md:hidden">
                      <div 
                        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsFilterPanelOpen(false)}
                      />
                      <div 
                        className="fixed inset-x-0 bottom-0 z-[9999] w-full bg-card border-t border-accent/30 shadow-2xl rounded-t-3xl p-5 flex flex-col gap-4 max-h-[82vh] overflow-y-auto custom-scrollbar pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom-4 duration-200"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-border sticky top-0 bg-card z-10">
                          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                            <Filter className="size-4 text-accent" /> Filter Tafsirs
                          </h3>
                          <button 
                            onClick={() => setIsFilterPanelOpen(false)} 
                            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            aria-label="Close filters"
                          >
                            <X className="size-5" />
                          </button>
                        </div>
                        
                        {/* Era Selection inside Panel */}
                        <div className="flex flex-col gap-2.5">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <BookOpen className="size-3.5 text-accent" /> Era
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {ERAS.map((eraName) => {
                              const count = eraName === "All Eras" 
                                ? allAuthorsWithLang.length 
                                : allAuthorsWithLang.filter(a => a.author.era === eraName).length;
                              return (
                                <button
                                  key={eraName}
                                  onClick={() => setSelectedEra(eraName)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    selectedEra === eraName
                                      ? "bg-accent text-accent-foreground shadow-sm"
                                      : "bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
                                  }`}
                                >
                                  {eraName.replace(" & Contemporary", "")} <span className="opacity-60 ml-0.5">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Difficulty Selection inside Panel */}
                        <div className="flex flex-col gap-2.5">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="size-3.5 text-accent" /> Difficulty
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {["All Levels", "Beginner", "Intermediate", "Advanced"].map((level) => {
                              const count = level === "All Levels" 
                                ? allAuthorsWithLang.length 
                                : allAuthorsWithLang.filter(a => a.author.difficulty === level).length;
                              return (
                                <button
                                  key={level}
                                  onClick={() => setSelectedDifficulty(level)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    selectedDifficulty === level
                                      ? "bg-accent text-accent-foreground shadow-sm"
                                      : "bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
                                  }`}
                                >
                                  {level} <span className="opacity-60 ml-0.5">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom Action Row */}
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-3 mt-1">
                          {(selectedEra !== "All Eras" || selectedDifficulty !== "All Levels") ? (
                            <button
                              onClick={() => {
                                setSelectedEra("All Eras");
                                setSelectedDifficulty("All Levels");
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
                            >
                              Reset filters
                            </button>
                          ) : <div />}
                          <button
                            onClick={() => setIsFilterPanelOpen(false)}
                            className="px-5 py-2 rounded-xl bg-accent text-accent-foreground font-semibold text-xs transition-colors hover:bg-accent/90 cursor-pointer shadow-sm"
                          >
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            </div>
            
          </div>

          {/* Language Filter Tabs */}
          <div className="relative flex items-center w-full mt-3 pt-3 border-t border-border group">
            {/* Scroll Left Button (Desktop) */}
            {canScrollLangLeft && (
              <button
                type="button"
                onClick={() => scrollLangHorizontally("left")}
                className="hidden md:flex absolute left-0 z-20 items-center justify-center size-7 rounded-full bg-card border border-border text-reading hover:text-foreground hover:bg-muted shadow-xl backdrop-blur transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Left fade gradient when scrollable */}
            {canScrollLangLeft && (
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
            )}

            {/* Horizontal Scrollable Tabs */}
            <div 
              ref={langScrollRef}
              onPointerDown={handleLangPointerDown}
              onPointerMove={handleLangPointerMove}
              onPointerUp={handleLangPointerUp}
              onPointerCancel={handleLangPointerUp}
              onWheel={(e) => {
                if (e.deltaY !== 0 && e.deltaX === 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                  checkLangScrollability();
                }
              }}
              onClickCapture={(e) => {
                if (dragStartRef.current.hasMoved) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
              className={`flex items-center gap-2 overflow-x-auto no-scrollbar w-full select-none ${
                isDraggingLang ? "cursor-grabbing" : "cursor-grab"
              }`}
            >
              <span className="text-xs font-semibold text-muted-foreground pr-2 whitespace-nowrap flex items-center gap-1.5 shrink-0 pointer-events-none">
                <Languages className="size-3.5 text-accent" /> Language:
              </span>
              <button
                onClick={() => setSelectedLanguage("All")}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedLanguage === "All"
                    ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                    : "bg-card/70 border border-border text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                All ({allAuthorsWithLang.length})
              </button>
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.name)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedLanguage === lang.name
                      ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                      : "bg-card/70 border border-border text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {lang.name} ({lang.authors?.length || 0})
                </button>
              ))}
            </div>

            {/* Right fade gradient when scrollable */}
            {canScrollLangRight && (
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            )}

            {/* Scroll Right Button (Desktop) */}
            {canScrollLangRight && (
              <button
                type="button"
                onClick={() => scrollLangHorizontally("right")}
                className="hidden md:flex absolute right-0 z-20 items-center justify-center size-7 rounded-full bg-card border border-border text-reading hover:text-foreground hover:bg-muted shadow-xl backdrop-blur transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Continue Reading Banner (when user has saved reading progress) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-2">
        <ContinueReadingBanner
          onContinue={(item) => {
            const author = allAuthorsWithLang.find(
              (a) => a.author.id === item.authorId
            )?.author || {
              id: item.authorId,
              name: item.authorName,
              languageId: 1,
            };
            setActiveAuthor(author);
            setActiveLangName(item.langName || "");
            setActiveSurah(item.surahId);
            setTargetAyahToScroll({ surah: item.surahId, ayah: item.ayahNumber });
            pendingScrollAyahRef.current = item.ayahNumber;
          }}
        />
      </div>

      {/* Grid of Tafsir Containers (1 col -> 2 -> 3 -> 4 cols on laptop view) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {loadingCatalog ? (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden border border-border bg-card/40 rounded-xl h-[112px] px-4 py-3 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted/70 rounded w-1/2" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 bg-muted/60 rounded w-1/3" />
                  <div className="h-3 bg-muted/60 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAuthors.length === 0 ? (
          <div className="text-center py-20 bg-card/40 border border-border rounded-xl">
            <p className="text-muted-foreground text-sm">No Tafsir books found matching your filter selections.</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {filteredAuthors.map(({ author, language }, index) => {
              const difficultyLevel = author.difficulty || getTafsirDifficulty(author.name, author.authorName);
              return (
                <div
                  key={`${language.id}-${author.id}`}
                  onClick={() => {
                    setSelectedAuthorForWheel(author);
                    setSelectedLangForWheel(language.name);
                    setWheelModalOpen(true);
                  }}
                  className="relative overflow-hidden border border-border hover:border-accent/40 bg-card group cursor-pointer rounded-xl h-[112px] px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
                >
                  {/* Giant Faded Watermark Number */}
                  <div className="absolute -right-2 -bottom-4 text-[75px] font-black text-accent/30 group-hover:text-accent transition-colors duration-500 pointer-events-none select-none leading-none">
                    {index + 1}
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-2 min-w-0">
                    <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                      <p className="font-semibold text-foreground group-hover:text-accent transition-colors text-sm sm:text-base truncate leading-tight">
                        {author.name}
                      </p>
                      {author.authorName && (
                        <p className="text-[11px] text-accent font-medium flex items-center gap-1 min-w-0">
                          <User className="size-3 text-accent shrink-0" />
                          <span className="text-muted-foreground shrink-0">Author:</span>
                          <span className="truncate" title={author.authorName}>{author.authorName}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5 truncate">
                        <span className="text-reading font-medium shrink-0">{language.name}</span>
                        {author.era && (
                          <>
                            <span className="shrink-0">•</span>
                            <span className="text-muted-foreground truncate" title={author.era}>
                              {author.era.replace(" & Contemporary", "")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Difficulty Level & Pro Badge */}
                <div className="relative z-10 flex items-center justify-between gap-1.5 pt-1 border-t border-border overflow-hidden">
                  {difficultyLevel && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border truncate max-w-[140px] bg-accent/10 text-accent border-accent/25">
                      {difficultyLevel}
                    </span>
                  )}
                  {/* {!isFreeTafsirAuthor(author.name, author.authorName) && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      <Lock className="size-2.5" />
                      <span>PRO</span>
                    </span>
                  )} */}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      <AyahWheelPickerModal
        isOpen={wheelModalOpen}
        onClose={() => setWheelModalOpen(false)}
        tafsirName={selectedAuthorForWheel ? selectedAuthorForWheel.name : undefined}
        initialSurah={activeSurah}
        initialAyah={currentAyahIndex + 1}
        onSelectPassage={(surahNum, ayahNum) => {
          if (selectedAuthorForWheel) {
            setActiveAuthor(selectedAuthorForWheel);
            setActiveLangName(selectedLangForWheel);
            setSelectedAuthorForWheel(null);
          }
          setActiveSurah(surahNum);
          setTargetAyahToScroll({ surah: surahNum, ayah: ayahNum });
          pendingScrollAyahRef.current = ayahNum;
        }}
      />

      <HighlightToolbar
        selection={highlightSelection}
        onHighlight={async (color: HighlightColor) => {
          if (!highlightSelection) return;
          const { text, surahNumber, ayahNumber, type, id } = highlightSelection;
          // If re-highlighting an existing one, remove it first
          if (id || highlightSelection.isExisting) {
            const match = highlights.find(h => h.id === id || (h.text === text && h.surahId === surahNumber && h.ayahNumber === ayahNumber));
            if (match) {
              await deleteUserHighlight(match.id);
              setHighlights(prev => prev.filter(h => h.id !== match.id));
            }
          }
          const authorStr = type === 'translation' && (activeAuthor as any)?.authorName ? (activeAuthor as any).authorName : undefined;
          const res = await saveUserHighlight(surahNumber, ayahNumber, text, type, authorStr, color);
          if (res) {
            toast.success("Highlight saved.");
            setHighlights(prev => [...prev, res]);
          } else {
            toast.error("Failed to save highlight.");
          }
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
        onDelete={async () => {
          if (!highlightSelection) return;
          const { text, surahNumber, ayahNumber, id } = highlightSelection;
          const match = highlights.find(h => h.id === id || (h.text === text && h.surahId === surahNumber && h.ayahNumber === ayahNumber));
          if (match) {
            const success = await deleteUserHighlight(match.id);
            if (success) {
              toast.success("Highlight removed.");
              setHighlights(prev => prev.filter(h => h.id !== match.id));
            } else {
              toast.error("Failed to remove highlight.");
            }
          }
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
        onNote={() => {
          if (!highlightSelection) return;
          setNoteSelectedText(highlightSelection.text);
          setIsNoteModalOpen(true);
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
        onCopy={() => {
          if (!highlightSelection) return;
          copyToClipboard(highlightSelection.text, "Copied to clipboard!");
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
        onShare={() => {
          if (!highlightSelection) return;
          if (navigator.share) {
            navigator.share({ title: 'Al-Juthur Tafsir', text: highlightSelection.text }).catch(console.error);
          } else {
            copyToClipboard(highlightSelection.text, "Copied to clipboard!");
          }
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
        onClose={() => {
          setHighlightSelection(null);
          window.getSelection()?.removeAllRanges();
        }}
      />
    </div>
  );
}


export default function TafsirPage() {
  return (
    <Suspense fallback={null}>
      <TafsirContent />
    </Suspense>
  );
}

function TafsirCard({ 
  entry, 
  idx, 
  activeSurah, 
  activeLangName, 
  activeAuthor,
  aiChatContext, 
  scrollToAyah,
  languages = [],
  highlights = [],
  notes = [],
}: {
  entry: any;
  idx: number;
  activeSurah: number;
  activeLangName: string;
  activeAuthor?: Author | null;
  aiChatContext: any;
  scrollToAyah: (num: number) => void;
  languages?: Language[];
  highlights?: UserHighlight[];
  notes?: UserNote[];
}) {
  const ayahNumber = entry.ayah?.numberInSurah || idx + 1;
  const arabicText = entry.ayah?.text && entry.ayah.text !== "Arabic Text" ? entry.ayah.text : null;
  const isArabic = activeLangName.toLowerCase().includes('arabic') || activeLangName === 'العربية';
  const isUrduText = activeLangName.toLowerCase().includes('urdu');
  const isArabicOrUrdu = isArabic || isUrduText;
  const cleanText = entry.text.replace(/<[^>]*>?/gm, '');

  // Notes for this specific ayah
  const ayahNotes = notes.filter(n => n.surahId === activeSurah && n.ayahNumber === ayahNumber);

  const { tier, openPricingModal } = useSubscriptionStore();
  const authorId = entry.authorId || activeAuthor?.id || 0;
  const authorName = entry.author?.name || activeAuthor?.name || `Tafsir #${authorId}`;
  const isLocked = false;
  const isPreviewInSurahOne = false;

  const surahMeta = SURAHS_DATA.find((s) => s.number === activeSurah);

  const savedKey = `tafsir_${authorId}_${activeSurah}_${ayahNumber}`;
  const [isSaved, setIsSaved] = useState<boolean>(() => isTafsirSaved(savedKey));
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);

  const handleToggleSave = () => {
    const snippet = cleanText.slice(0, 280);
    const newlySaved = saveTafsirItem({
      id: savedKey,
      surahId: activeSurah,
      surahName: surahMeta?.englishName || `Surah ${activeSurah}`,
      ayahNumber: ayahNumber,
      authorId: authorId,
      authorName: authorName,
      langName: activeLangName,
      arabicText: arabicText || undefined,
      tafsirSnippet: snippet,
      fullTafsirText: cleanText,
      timestamp: Date.now(),
    });
    setIsSaved(newlySaved);
    if (newlySaved) {
      toast.success(`Saved Tafsir for ${surahMeta?.englishName || "Surah " + activeSurah} : ${ayahNumber} to Profile!`);
    } else {
      toast.info(`Removed Tafsir for ${surahMeta?.englishName || "Surah " + activeSurah} : ${ayahNumber} from Saved`);
    }
  };

  return (
    <div className="pb-10">
      <AyahNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        surahNumber={activeSurah}
        ayahNumber={ayahNumber}
      />
      <div
        id={`ayah-${ayahNumber}`}
        data-ayah-idx={idx}
        data-surah-num={activeSurah}
        data-ayah-num={ayahNumber}
        className="space-y-6 scroll-mt-24 border-b border-border pb-10"
      >
        {/* Free Preview Banner for Surah 1 on Locked Authors */}
        {isPreviewInSurahOne && idx === 0 && (
          <div className="p-3 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-between text-xs text-accent">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent shrink-0" />
              <span>
                <strong>Free Preview:</strong> You are enjoying full free access to <strong>{authorName}</strong> on Surah Al-Fatihah!
              </span>
            </div>
            <button
              onClick={openPricingModal}
              className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-[11px] transition-all cursor-pointer shrink-0 ml-2"
            >
              Unlock All
            </button>
          </div>
        )}

        {/* Static Ayah Header & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/25 px-2.5 py-1 rounded-full shrink-0">
              {activeSurah}:{ayahNumber}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {surahMeta?.englishName || `Surah ${activeSurah}`} • Verse {ayahNumber}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {authorName}
              </span>
            </div>
            {/* Note indicator badge */}
            {ayahNotes.length > 0 && (
              <button
                onClick={() => setShowNotesPanel(p => !p)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-semibold hover:bg-amber-500/25 transition shrink-0"
                title="View your notes"
              >
                <StickyNote className="size-3" />
                {ayahNotes.length}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleToggleSave}
              className={cn(
                "flex items-center rounded-lg transition font-medium whitespace-nowrap gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs cursor-pointer",
                isSaved 
                  ? "bg-accent/15 text-accent border border-accent/40 hover:bg-accent/20 shadow-sm" 
                  : "bg-muted hover:bg-muted text-reading",
                aiChatContext && "lg:gap-1 lg:px-2 lg:text-[10px]"
              )}
              title={isSaved ? "Remove from Saved" : "Save Tafsir to Profile"}
            >
              {isSaved ? (
                <BookmarkCheck className={cn("shrink-0 size-3.5 text-accent", aiChatContext && "lg:size-3")} />
              ) : (
                <Bookmark className={cn("shrink-0 size-3.5", aiChatContext && "lg:size-3")} />
              )}
              <span className={cn("hidden sm:inline", aiChatContext && "lg:hidden")}>
                {isSaved ? "Saved" : "Save"}
              </span>
            </button>

            <button
              onClick={() => setIsNoteModalOpen(true)}
              className={cn(
                "flex items-center rounded-lg bg-muted hover:bg-muted transition font-medium text-accent hover:text-accent whitespace-nowrap gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs cursor-pointer",
                aiChatContext && "lg:gap-1 lg:px-2 lg:text-[10px]"
              )}
              title="Add Note"
            >
              <Edit3 className={cn("shrink-0 size-3.5", aiChatContext && "lg:size-3")} />
              <span className={cn("hidden sm:inline", aiChatContext && "lg:hidden")}>Note</span>
            </button>

            <button
              onClick={() => {
                copyToClipboard(cleanText, "Tafsir explanation copied to clipboard!");
              }}
              className={cn(
                "flex items-center rounded-lg bg-muted hover:bg-muted transition font-medium text-reading whitespace-nowrap gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs cursor-pointer",
                aiChatContext && "lg:gap-1 lg:px-2 lg:text-[10px]"
              )}
              title="Copy Tafsir"
            >
              <Copy className={cn("shrink-0 size-3.5", aiChatContext && "lg:size-3")} />
              <span className={cn("hidden sm:inline", aiChatContext && "lg:hidden")}>Copy</span>
            </button>
          </div>
        </div>

        {/* Arabic Verse */}
        {arabicText && (
          <div className="py-2">
            <p lang="ar" className={`font-mushaf-indopak-16 text-[1.65rem] md:text-4xl text-right leading-loose text-arabic font-normal`} dir="rtl" style={{ lineHeight: '2.4' }}>
              {arabicText}
            </p>
          </div>
        )}

        {/* Tafsir Text */}
        <div className="pt-2 reading-measure reading-prose">
          <TafsirTextRenderer
            text={entry.text}
            isArabic={isArabic}
            isUrdu={isUrduText}
            langName={activeLangName}
            isLocked={isLocked}
            authorName={authorName}
            onNavigateToAyah={(num) => scrollToAyah(num)}
            onUpgradeClick={openPricingModal}
            highlights={highlights}
          />
        </div>

        {/* Inline Translation (Exclusively for Arabic Tafsirs) */}
        {isArabic && !isLocked && (
          <div className="mt-4 pt-4 border-t border-border/40 w-full">
            <InlineTranslation 
              textToTranslate={cleanText} 
              storageKey={`tafsir_${entry.authorId || 'auth'}_${activeSurah}_${ayahNumber}`}
            />
          </div>
        )}

        {/* Tafsir (Commentary / Footnotes) */}
        {!isLocked && entry.footnoteIds && entry.footnoteIds.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <TafsirFootnotesLoader 
              footnoteIds={entry.footnoteIds} 
              initialFootnotes={entry.footnotes}
              isUrdu={isUrduText} 
            />
          </div>
        )}
        {activeAuthor && (
          <TafsirComparePanel
            ayahIndex={idx}
            ayahNumber={ayahNumber}
            surahId={activeSurah}
            currentAuthorId={authorId}
            languages={languages}
          />
        )}

        {/* Notes panel — shown when user clicks the note badge */}
        {showNotesPanel && ayahNotes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <StickyNote className="size-3.5" />
              Your Notes ({ayahNotes.length})
            </div>
            {ayahNotes.map(note => (
              <div key={note.id} className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {note.text}
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
