"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { ArrowLeft, BookOpen, Search, Sparkles, ChevronRight, Copy, Languages, User, BookOpenText, ChevronUp, ChevronDown, X, Bot, Compass, Filter, Library } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import TafsirTextRenderer from "@/components/tafsir/TafsirTextRenderer";
import { amiriquran, inter } from "@/app/fonts";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
import FloatingAskScholarButton from "@/components/ai/FloatingAskScholarButton";
import AyahWheelPickerModal from "@/components/tafsir/AyahWheelPickerModal";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { copyToClipboard, cn } from "@/lib/utils";
import { getTafsirFameRank, getLanguagePriority, getTafsirDifficulty } from "@/lib/tafsirRanking";
import { getTafsirWarning } from "@/lib/tafsirWarnings";
import InlineTranslation from "@/components/shared/InlineTranslation";

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
}

const getTagColorClass = (color?: string) => {
  switch (color) {
    case "amber": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "emerald": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "blue": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "purple": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "cyan": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    default: return "bg-zinc-800/80 text-zinc-400 border-zinc-700/60";
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
  if (!query.trim()) return true;

  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  const rawTarget = `${author.name} ${author.authorName || ""} ${language.name} ${
    author.tags?.map((t) => t.name).join(" ") || ""
  } ${author.era || ""}`;

  const normalizedTarget = normalizeText(rawTarget);
  const strippedTarget = normalizedTarget.replace(/\b(al|ar|an|at|az|as|ad|ash|el)\s+/g, " ");

  return queryTokens.every((token) => {
    return normalizedTarget.includes(token) || strippedTarget.includes(token);
  });
};

const TafsirFootnotesLoader = ({ footnoteIds, isUrdu }: { footnoteIds: string[], isUrdu?: boolean }) => {
  const [fetchedFootnotes, setFetchedFootnotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchAll = async () => {
      const newFootnotes = { ...fetchedFootnotes };
      let updated = false;
      for (const fId of footnoteIds) {
        if (!newFootnotes[fId]) {
          try {
            const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${fId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.foot_note) {
                newFootnotes[fId] = data.foot_note.text;
                updated = true;
              }
            }
          } catch(e) {
            console.error(e);
          }
        }
      }
      if (isMounted) {
        if (updated) setFetchedFootnotes(newFootnotes);
        setLoading(false);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [footnoteIds]);

  if (loading && Object.keys(fetchedFootnotes).length === 0) {
    return <p className="text-zinc-500 animate-pulse text-xs">Loading explanation...</p>;
  }

  return (
    <div className="space-y-3">
      {footnoteIds.map((fId, idx) => (
        <div 
          key={fId} 
          className="leading-relaxed text-sm text-zinc-300" 
          dir={isUrdu ? "rtl" : "auto"}
          style={{
            fontFamily: isUrdu ? "'Noto Nastaliq Urdu', serif" : undefined,
            lineHeight: isUrdu ? "2.2" : undefined,
            fontSize: isUrdu ? "1.1rem" : undefined
          }}
        >
          <span className="text-emerald-500 font-bold mx-2 inline-block" dir="ltr">[{idx + 1}]</span>
          <span dangerouslySetInnerHTML={{ __html: fetchedFootnotes[fId] || "Explanation unavailable." }} />
        </div>
      ))}
    </div>
  );
};

function TafsirContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [selectedEra, setSelectedEra] = useState<string>("All Eras");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All Levels");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
  const [activeAuthor, setActiveAuthor] = useState<Author | null>(null);
  const [activeLangName, setActiveLangName] = useState<string>("");
  const [activeSurah, setActiveSurah] = useState<number>(1);
  const [loadedTafsir, setLoadedTafsir] = useState<Record<number, TafsirEntry>>({});
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const tafsirCacheRef = useRef<Map<string, TafsirEntry[]>>(new Map());
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const loadingPagesRef = useRef<Set<number>>(new Set());
  const TAFSIR_PAGE_SIZE = 15;

  const [topNavVisible, setTopNavVisible] = useState<boolean>(true);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollYRef = useRef<number>(0);

  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);

  // Ayah Wheel Picker Modal State
  const [wheelModalOpen, setWheelModalOpen] = useState<boolean>(false);
  const [selectedAuthorForWheel, setSelectedAuthorForWheel] = useState<Author | null>(null);
  const [selectedLangForWheel, setSelectedLangForWheel] = useState<string>("");
  const [targetAyahToScroll, setTargetAyahToScroll] = useState<{ surah: number; ayah: number } | null>(null);

  // URL param target
  const urlAyah = searchParams?.get("ayah");
  const urlSurah = searchParams?.get("surah");
  const urlAuthor = searchParams?.get("author");

  // Fetch all languages & authors on mount

  useEffect(() => {
    fetch("/api/tafsir")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const sorted = [...data.data].sort((a, b) => {
            const getRank = (name: string) => {
              const lower = name.toLowerCase();
              if (lower === 'arabic') return 1;
              if (lower === 'english') return 2;
              if (lower === 'urdu') return 3;
              return 4;
            };
            const rankA = getRank(a.name);
            const rankB = getRank(b.name);
            if (rankA !== rankB) return rankA - rankB;
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
      .catch((err) => console.error("Failed to fetch languages:", err));
  }, [urlAuthor]);

  const fetchTafsirPage = useCallback(async (page: number) => {
    if (!activeAuthor) return;
    if (loadedPagesRef.current.has(page) || loadingPagesRef.current.has(page)) return;
    loadingPagesRef.current.add(page);

    const start = page * TAFSIR_PAGE_SIZE + 1;
    const authorId = activeAuthor.id;
    const surahId = activeSurah;

    try {
      const res = await fetch(
        `/api/tafsir?authorId=${authorId}&surahId=${surahId}&start=${start}&count=${TAFSIR_PAGE_SIZE}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLoadedTafsir((prev) => {
          const next = { ...prev };
          data.data.forEach((entry: TafsirEntry, i: number) => {
            next[start - 1 + i] = entry;
          });
          return next;
        });
        loadedPagesRef.current.add(page);
      }
    } catch (e) {
      console.error(`[TafsirReader] Failed to load page ${page}:`, e);
    } finally {
      loadingPagesRef.current.delete(page);
    }
  }, [activeAuthor, activeSurah]);

  // Fetch initial Tafsir page when author or surah changes (with instant client cache)
  useEffect(() => {
    if (!activeAuthor) return;

    const cacheKey = `${activeAuthor.id}:${activeSurah}`;
    if (tafsirCacheRef.current.has(cacheKey)) {
      const cached = tafsirCacheRef.current.get(cacheKey)!;
      const map: Record<number, TafsirEntry> = {};
      cached.forEach((item, idx) => { map[idx] = item; });
      setLoadedTafsir(map);
      loadedPagesRef.current = new Set(Array.from({ length: Math.ceil(cached.length / TAFSIR_PAGE_SIZE) }, (_, i) => i));
      loadingPagesRef.current = new Set();
      setLoadingEntries(false);
      return;
    }

    loadedPagesRef.current = new Set();
    loadingPagesRef.current = new Set();
    setLoadedTafsir({});
    setLoadingEntries(true);

    fetchTafsirPage(0).finally(() => {
      setLoadingEntries(false);
    });
  }, [activeAuthor, activeSurah, fetchTafsirPage]);

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
    return allAuthorsWithLang.filter(({ author, language }) => {
      const matchesLang =
        selectedLanguage === "All" ||
        language.name.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesEra =
        selectedEra === "All Eras" ||
        author.era === selectedEra;
      const matchesDifficulty =
        selectedDifficulty === "All Levels" ||
        author.difficulty === selectedDifficulty;
      const matchesSearch = matchesSmartSearch(author, language, searchQuery);
      return matchesLang && matchesEra && matchesDifficulty && matchesSearch;
    });
  }, [allAuthorsWithLang, selectedLanguage, selectedEra, selectedDifficulty, searchQuery]);

  const currentSurahMeta = SURAHS_DATA.find((s) => s.number === activeSurah) || SURAHS_DATA[0];

  // Handle URL params: navigate to author's surah/ayah on mount if params present
  useEffect(() => {
    if (urlSurah) {
      const n = parseInt(urlSurah, 10);
      if (!isNaN(n) && n >= 1 && n <= 114) setActiveSurah(n);
    }
  }, [urlSurah]);



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

  // IntersectionObserver for Ayah index tracking removed to improve performance
  // and eliminate the "live tracking" effect per user request.

  const scrollToAyah = useCallback((num: number) => {
    const targetIdx = Math.max(0, num - 1);
    setCurrentAyahIndex(targetIdx);
    const targetPage = Math.floor(targetIdx / TAFSIR_PAGE_SIZE);

    if (!loadedPagesRef.current.has(targetPage)) {
      fetchTafsirPage(targetPage).then(() => {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: targetIdx, align: "start", behavior: "smooth" });
          const trackerEl = document.getElementById(`ayah-tracker-${num}`);
          if (trackerEl) {
            trackerEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          const cardEl = document.getElementById(`ayah-${num}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      });
    } else {
      virtuosoRef.current?.scrollToIndex({ index: targetIdx, align: "start", behavior: "smooth" });
      const trackerEl = document.getElementById(`ayah-tracker-${num}`);
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const cardEl = document.getElementById(`ayah-${num}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [fetchTafsirPage]);

  // Auto-scroll to target ayah from URL param
  useEffect(() => {
    if (!urlAyah || !activeAuthor) return;
    const n = parseInt(urlAyah, 10);
    if (isNaN(n) || n < 1) return;
    
    scrollToAyah(n);
  }, [urlAyah, activeAuthor, scrollToAyah]);

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

  // Auto scroll to target ayah set by Ayah Picker
  useEffect(() => {
    if (targetAyahToScroll && targetAyahToScroll.surah === activeSurah) {
      scrollToAyah(targetAyahToScroll.ayah);
      setTargetAyahToScroll(null);
    }
  }, [targetAyahToScroll, activeSurah, scrollToAyah]);

  // Reset to Verse 1 at the top of the page when changing Surah (unless a target ayah was selected)
  useEffect(() => {
    if (!targetAyahToScroll) {
      setCurrentAyahIndex(0);
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      const trackerEl = document.getElementById(`ayah-tracker-1`);
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSurah]);

  // Auto-scroll the left sidebar Surah selector to the active Surah
  useEffect(() => {
    if (activeAuthor && activeSurah > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`tafsir-surah-${activeSurah}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeSurah, activeAuthor]);

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



    // ── STANDARD MODE ──────────────────────────────────────────
    return (
      <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white ${inter.className} transition-all duration-300`}>
        {/* Top Navigation Bar (Mobile Only) */}
        <div className={`md:hidden sticky top-0 z-40 bg-zinc-950/60 backdrop-blur-3xl border-b border-zinc-800/80 px-3 py-3 transition-all duration-300 ${topNavVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
          <div className="max-w-[1700px] mx-auto">
            {/* Top Row: Back, Title, Immersive Toggle */}
            <div className="flex items-center justify-between gap-2 md:gap-4 w-full">
              {/* Left Side: Back + Title */}
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <button
                  onClick={() => setActiveAuthor(null)}
                  className="flex items-center justify-center p-2 md:px-3 md:py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-sm font-medium transition-all text-zinc-300 hover:text-white shrink-0"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden md:inline ml-2">All Tafsirs</span>
                </button>
                
                <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1 shrink-0" />
                
                <div className="flex flex-col min-w-0 justify-center">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-sm md:text-base font-bold text-zinc-100 leading-tight truncate">
                      {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                    </h1>
                    <span className="hidden md:inline-flex text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold uppercase tracking-wider shrink-0 mt-0.5">
                      {activeLangName}
                    </span>
                  </div>
                  {activeAuthor.authorName && (
                    <p className="hidden md:flex text-[11px] text-zinc-500 truncate">
                      {activeAuthor.authorName}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Side: Ayah Picker Button */}
              <button
                onClick={() => {
                  setSelectedAuthorForWheel(activeAuthor);
                  setSelectedLangForWheel(activeLangName);
                  setWheelModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 transition-all shrink-0 cursor-pointer"
              >
                <Compass className="size-3.5" />
                <span>Ayah Picker</span>
              </button>
            </div>

            {/* Bottom Row (Mobile Only): Surah & Ayah Dropdowns */}
            <div className="md:hidden flex gap-2 w-full mt-3">
              {/* Surah Dropdown */}
              <div className="relative flex-1 min-w-0">
                <select
                  value={activeSurah}
                  onChange={(e) => setActiveSurah(Number(e.target.value))}
                  className="w-full appearance-none bg-zinc-900 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-300 font-medium focus:outline-none focus:border-emerald-500/50 pr-8 shadow-sm truncate"
                >
                  {SURAHS_DATA.map((s) => (
                    <option key={s.number} value={s.number} className="bg-zinc-900 text-zinc-200">
                      {s.number}. {s.englishName}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none rotate-90" />
              </div>

              {/* Ayah Dropdown */}
              <div className="relative w-28 shrink-0">
                <select
                  value={currentAyahIndex + 1}
                  onChange={(e) => scrollToAyah(Number(e.target.value))}
                  className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 font-medium focus:outline-none focus:border-emerald-500/50 pr-8 shadow-sm"
                >
                  {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num} className="bg-zinc-900 text-zinc-200">
                      Ayah {num}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none rotate-90" />
              </div>
            </div>
          </div>
        </div>
        {/* Layout: Sidebar + Main Content + Right Ayah Navigator */}
        <div className={cn("w-full flex min-h-screen transition-all duration-300", aiChatContext ? "lg:pr-[420px] xl:pr-[450px]" : "")}>
          {/* Left Sidebar: 114 Surahs */}
          <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 border-r border-zinc-800/60 bg-zinc-950/50 sticky top-0 h-screen overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-950/90 z-10 flex flex-col gap-4">
              {/* Tafsir Header Info */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setActiveAuthor(null)}
                  className="flex items-center justify-center p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 transition-all text-zinc-400 hover:text-white shrink-0"
                  title="Back to All Tafsirs"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex flex-col min-w-0 justify-center py-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="text-sm font-bold text-zinc-100 leading-snug break-words">
                      {activeAuthor.name.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                    </h1>
                    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold uppercase tracking-wider shrink-0">
                      {activeLangName}
                    </span>
                  </div>
                  {activeAuthor.authorName && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {activeAuthor.authorName}
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar Header */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Surahs (1 - 114)
                </h2>
                <button
                  onClick={() => {
                    setSelectedAuthorForWheel(activeAuthor);
                    setSelectedLangForWheel(activeLangName);
                    setWheelModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-400 transition-all cursor-pointer"
                  title="Open Ayah Picker"
                >
                  <Compass className="size-3" />
                  <span>Ayah Picker</span>
                </button>
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
                        ? "bg-emerald-500/15 border border-emerald-500/40 text-white shadow-sm"
                        : "hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-6 rounded-md flex items-center justify-center text-xs font-bold ${isActive ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800/80 text-zinc-400"}`}>
                        {surah.number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-200">{surah.englishName}</span>
                        <span className="text-[11px] text-zinc-500">{surah.englishNameTranslation}</span>
                      </div>
                    </div>
                    <span className={`${amiriquran.className} text-base text-zinc-300`}>{surah.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-8 space-y-8 min-w-0 transition-all duration-300">

            {authorWarning.hasWarning && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex gap-3 text-amber-200 text-sm">
                <Sparkles className="size-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-400 mb-1">Methodological Note</h4>
                  <p>{authorWarning.message}</p>
                </div>
              </div>
            )}

            {/* Surah Banner Header */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 transition-all duration-300",
              aiChatContext ? "p-4 sm:p-5" : "p-4 sm:p-6 lg:p-8"
            )}>
              <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className={cn(
                "relative z-10 min-w-0 transition-all flex flex-col items-center justify-center text-center gap-2",
                aiChatContext ? "gap-2" : "gap-3"
              )}>
                <div className="min-w-0 flex-1 flex flex-col items-center">
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-emerald-400 mb-1">
                    <span>Surah {currentSurahMeta.number}</span>
                    <span>•</span>
                    <span>{currentSurahMeta.revelationType}</span>
                    <span>•</span>
                    <span>{currentSurahMeta.numberOfAyahs} Ayahs</span>
                  </div>
                  <h2 className={cn(
                    "font-extrabold text-white leading-tight transition-all [word-break:break-word] text-center",
                    aiChatContext ? "text-base sm:text-lg" : "text-lg sm:text-xl lg:text-2xl xl:text-3xl"
                  )}>
                    {currentSurahMeta.englishName} ({currentSurahMeta.englishNameTranslation})
                  </h2>
                </div>
                <div className="shrink-0 transition-all mt-1">
                  <h3 className={cn(
                    "font-mushaf-uthmani text-emerald-300 leading-relaxed transition-all text-center",
                    aiChatContext ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl xl:text-[2.75rem]"
                  )}>
                    {currentSurahMeta.name}
                  </h3>
                </div>
              </div>

              {currentSurahMeta.number !== 9 && (
                <div className="mt-4 pt-4 border-t border-zinc-800/60 text-center">
                  <p className={cn(
                    "font-mushaf-indopak-16 text-amber-100/90 tracking-wide leading-loose transition-all",
                    aiChatContext ? "text-lg sm:text-xl" : "text-[1.65rem] md:text-4xl"
                  )}>
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-h-0">
              <Virtuoso
                  ref={virtuosoRef}
                  useWindowScroll
                  totalCount={currentSurahMeta.numberOfAyahs}
                  rangeChanged={({ startIndex, endIndex }) => {
                    if (typeof startIndex === "number" && startIndex >= 0) {
                      setCurrentAyahIndex(startIndex);
                    }
                    const BUFFER = 10;
                    const firstNeeded = Math.max(0, startIndex - BUFFER);
                    const lastNeeded = Math.min(currentSurahMeta.numberOfAyahs - 1, endIndex + BUFFER);
                    const firstPage = Math.floor(firstNeeded / TAFSIR_PAGE_SIZE);
                    const lastPage = Math.floor(lastNeeded / TAFSIR_PAGE_SIZE);
                    for (let p = firstPage; p <= lastPage; p++) {
                      fetchTafsirPage(p);
                    }
                  }}
                  itemContent={(idx) => {
                    const entry = loadedTafsir[idx];
                    if (!entry) {
                      return (
                        <div key={`skeleton-${idx}`} className="border border-zinc-800/80 bg-zinc-900/40 rounded-xl p-6 mb-6 animate-pulse flex flex-col gap-4">
                          <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
                            <div className="w-20 h-6 bg-zinc-800 rounded-lg" />
                            <div className="w-16 h-6 bg-zinc-800/60 rounded" />
                          </div>
                          <div className="w-full h-12 bg-zinc-800/40 rounded-lg" />
                          <div className="space-y-2 mt-2">
                            <div className="w-full h-4 bg-zinc-800/30 rounded" />
                            <div className="w-5/6 h-4 bg-zinc-800/30 rounded" />
                            <div className="w-3/4 h-4 bg-zinc-800/20 rounded" />
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
                        aiChatContext={aiChatContext}
                        scrollToAyah={scrollToAyah}
                      />
                    );
                  }}
                />
              </div>
          </main>

          {/* Right Sidebar: Compact Ayah Jump Index */}
          <aside className={cn("flex-col w-16 lg:w-20 shrink-0 border-l border-zinc-800/60 bg-zinc-950/50 sticky top-0 h-screen overflow-y-auto no-scrollbar py-6 pb-28", aiChatContext ? "hidden xl:flex" : "hidden md:flex")}>
            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest text-center mb-6">Ayahs</div>
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
                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/30 scale-110"
                        : "text-zinc-500 hover:bg-emerald-500/20 hover:text-emerald-400"
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
          label="Ask Tafsir Scholar"
          isVisible={!aiChatContext}
        />

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
          }}
        />
      </div>
    );
  }

  // ==========================================
  // TAFSIR LIBRARY VIEW (GRID OF COLLECTION CARDS)
  // ==========================================
  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-36 md:pb-24 ${inter.className}`}>
      
      {/* Top Navigation Bar (Library View) */}
      <div className={`hidden md:block fixed top-0 inset-x-0 z-50 bg-zinc-950/80 backdrop-blur-3xl border-b border-zinc-800/80 px-4 md:px-8 py-3 shadow-sm transition-transform duration-300 ${topNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo and App Name */}
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center gap-2">
              <LogoIcon className="text-white size-6 hidden md:block" />
              <p className="font-bold text-lg md:text-xl text-white hidden md:block">Al-Juthur</p>
            </Link>
          </div>

          {/* Desktop Full Navigation (Same as Homepage) */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-zinc-400 text-sm font-medium">
            <Link href="/home" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              Home
            </Link>
            <Link href="/tafsir" className="cursor-pointer text-white font-medium">
              Tafsir
            </Link>
            <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition">
              Lexicon
            </Link>
            <Link href="/ai" className="cursor-pointer hover:text-gray-300 transition">
              Translator
            </Link>
            <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition">
              RAG Bot
            </Link>
          </nav>
        </div>
      </div>

      {/* Hero Header removed for cleaner UI consistency */}

      {/* Sticky Filters & Search (Action Bar) */}
      <div className={`sticky z-30 bg-zinc-950/90 backdrop-blur-xl border-y border-zinc-800/60 shadow-sm mb-6 transition-all duration-300 top-0 mt-16 md:mt-20 ${topNavVisible ? 'md:top-[53px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          
          {/* Action Row: Search, Refine, Active Chips */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
            
            {/* Left side: Title + Active Chips */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <Library className="size-5 text-emerald-400" />
                <span className="font-bold text-white text-base md:text-lg">Tafsir Library</span>
              </div>
              
              {/* Active Filter Feedback Chips */}
              {(selectedEra !== "All Eras" || selectedDifficulty !== "All Levels") && (
                <div className="flex flex-wrap items-center gap-2 md:pl-2">
                  {selectedEra !== "All Eras" && (
                    <button 
                      onClick={() => setSelectedEra("All Eras")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors group"
                    >
                      {selectedEra.replace(" & Contemporary", "")}
                      <X className="size-3 text-zinc-500 group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                  {selectedDifficulty !== "All Levels" && (
                    <button 
                      onClick={() => setSelectedDifficulty("All Levels")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors group"
                    >
                      {selectedDifficulty}
                      <X className="size-3 text-zinc-500 group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedEra("All Eras");
                      setSelectedDifficulty("All Levels");
                    }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-1 underline decoration-zinc-700 underline-offset-2 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Search and Refine */}
            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto shrink-0">
              <div ref={searchContainerRef} className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tafsirs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full bg-zinc-900/80 border border-emerald-500/30 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all hover:border-emerald-500/50 shadow-sm"
                />
                
                {/* Autocomplete Dropdown */}
                {isSearchFocused && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredAuthors.length > 0 ? (
                      <div className="p-1.5 flex flex-col gap-1">
                        {filteredAuthors.slice(0, 10).map(({ author, language }) => (
                          <button
                            key={`suggest-${language.id}-${author.id}`}
                            onClick={() => {
                              setSearchQuery(author.name);
                              setIsSearchFocused(false);
                            }}
                            className="flex flex-col text-left px-3 py-2 hover:bg-emerald-500/10 rounded-lg transition-colors w-full"
                          >
                            <span className="text-sm font-semibold text-zinc-200">{author.name}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              {author.authorName && <span>{author.authorName} • </span>}
                              <span className="text-emerald-400">{language.name}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-zinc-500 text-center">No matches found</div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    isFilterPanelOpen || selectedEra !== "All Eras" || selectedDifficulty !== "All Levels"
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-900/80 border-emerald-500/30 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/50"
                  }`}
                >
                  <Filter className="size-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Refine</span>
                  {(selectedEra !== "All Eras" || selectedDifficulty !== "All Levels") && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
                
                {/* Filter Popover Panel */}
                {isFilterPanelOpen && (
                  <>
                    <div className="fixed inset-0 z-[60] md:hidden bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterPanelOpen(false)}></div>
                    <div className="fixed md:absolute right-0 bottom-0 md:bottom-auto md:top-full mt-2 w-full md:w-[400px] bg-zinc-950 md:bg-zinc-900 border-t md:border border-zinc-800/80 shadow-2xl z-[60] overflow-hidden rounded-t-2xl md:rounded-2xl p-5 md:p-5 flex flex-col gap-6 max-h-[85vh] overflow-y-auto transform transition-transform">
                      <div className="flex items-center justify-between md:hidden pb-3 border-b border-zinc-800">
                        <h3 className="font-bold text-white text-lg">Filters</h3>
                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                          <X className="size-5" />
                        </button>
                      </div>
                      
                      {/* Era Selection inside Panel */}
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <BookOpen className="size-3.5 text-emerald-400" /> Era
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  selectedEra === eraName
                                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                                }`}
                              >
                                {eraName.replace(" & Contemporary", "")} <span className="opacity-60 ml-0.5">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Difficulty Selection inside Panel */}
                      <div className="flex flex-col gap-3 pb-4 md:pb-0">
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="size-3.5 text-emerald-400" /> Difficulty
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  selectedDifficulty === level
                                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                                }`}
                              >
                                {level} <span className="opacity-60 ml-0.5">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
          </div>

          {/* Language Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto mt-3 pt-3 border-t border-zinc-800/60 no-scrollbar w-full">
            <span className="text-xs font-semibold text-zinc-400 pr-2 whitespace-nowrap flex items-center gap-1.5 shrink-0">
              <Languages className="size-3.5 text-emerald-400" /> Language:
            </span>
            <button
              onClick={() => setSelectedLanguage("All")}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                selectedLanguage === "All"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              All Languages ({allAuthorsWithLang.length})
            </button>
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.name)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedLanguage === lang.name
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                {lang.name} ({lang.authors.length})
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Grid of Tafsir Containers (1 col -> 2 -> 3 -> 4 cols on laptop view) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {filteredAuthors.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
            <p className="text-zinc-400 text-sm">No Tafsir books found matching your filter selections.</p>
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
                  className="relative overflow-hidden border border-emerald-500/50 hover:border-emerald-500 bg-zinc-900/40 group cursor-pointer rounded-xl h-[112px] backdrop-blur-md px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
                >
                  {/* Giant Faded Watermark Number */}
                  <div className="absolute -right-2 -bottom-4 text-[75px] font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors duration-500 pointer-events-none select-none leading-none">
                    {index + 1}
                  </div>

                  <div className="relative z-10 flex items-start justify-between gap-2 min-w-0">
                    <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                      <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors text-sm sm:text-base truncate leading-tight">
                        {author.name}
                      </p>
                      {author.authorName && (
                        <p className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1 min-w-0">
                          <User className="size-3 text-emerald-400/70 shrink-0" />
                          <span className="text-zinc-400 shrink-0">Author:</span>
                          <span className="truncate" title={author.authorName}>{author.authorName}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-0.5 truncate">
                        <span className="text-zinc-300 font-medium shrink-0">{language.name}</span>
                        {author.era && (
                          <>
                            <span className="shrink-0">•</span>
                            <span className="text-zinc-400 truncate" title={author.era}>
                              {author.era.replace(" & Contemporary", "")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Top Right: Al-Juthur Logo */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <LogoIcon className="size-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                {/* Difficulty Level Bottom Badge */}
                {difficultyLevel && (
                  <div className="relative z-10 flex items-center gap-1.5 pt-1 border-t border-zinc-800/60 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border truncate max-w-[170px] ${
                      difficultyLevel === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      difficultyLevel === 'Advanced' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}>
                      {difficultyLevel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Ayah Wheel Picker Modal */}
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
  aiChatContext, 
  scrollToAyah 
}: {
  entry: any;
  idx: number;
  activeSurah: number;
  activeLangName: string;
  aiChatContext: any;
  scrollToAyah: (num: number) => void;
}) {
  const ayahNumber = entry.ayah?.numberInSurah || idx + 1;
  const arabicText = entry.ayah?.text && entry.ayah.text !== "Arabic Text" ? entry.ayah.text : null;
  const isArabicOrUrdu = activeLangName === 'Arabic' || activeLangName === 'Urdu';
  const isUrduText = activeLangName === 'Urdu';
  const cleanText = entry.text.replace(/<[^>]*>?/gm, '');

  return (
    <div className="pb-6">
      <div
        id={`ayah-${ayahNumber}`}
        data-ayah-idx={idx}
        className="border border-emerald-500/20 bg-zinc-900/40 rounded-xl p-5 md:p-7 transition-all hover:border-emerald-500/50 space-y-6 scroll-mt-24"
      >
        {/* Top Ayah Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <span className="shrink-0 h-7 px-1.5 min-w-[1.75rem] rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 whitespace-nowrap">
              {activeSurah}:{ayahNumber}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-zinc-300 whitespace-nowrap">Ayah {ayahNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                copyToClipboard(cleanText, "Tafsir explanation copied to clipboard!");
              }}
              className={cn(
                "flex items-center rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition font-medium text-zinc-300 whitespace-nowrap gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs",
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
            <p className={`font-mushaf-indopak-16 text-[1.65rem] md:text-4xl text-right leading-loose text-amber-100 font-normal`} dir="rtl" style={{ lineHeight: '2.4' }}>
              {arabicText}
            </p>
          </div>
        )}

        {/* Tafsir Text */}
        <div className="pt-2 border-t border-zinc-800/40">
          <TafsirTextRenderer
            text={entry.text}
            isArabic={isArabicOrUrdu}
            isUrdu={isUrduText}
            onNavigateToAyah={(num) => scrollToAyah(num)}
          />
        </div>

        {/* Inline Translation */}
        {activeLangName !== 'English' && (
          <div className="mt-4 pt-4 border-t border-zinc-800/40 w-full">
            <InlineTranslation textToTranslate={cleanText} />
          </div>
        )}

        {/* Explanation (Footnotes) */}
        {entry.footnoteIds && entry.footnoteIds.length > 0 && (
          <div className="mt-6 pt-4 border-t border-emerald-900/30">
            <div className="font-semibold text-emerald-500 uppercase tracking-wider text-[11px] mb-3 font-mono">
              Explanation
            </div>
            <TafsirFootnotesLoader footnoteIds={entry.footnoteIds} isUrdu={isUrduText} />
          </div>
        )}
      </div>
    </div>
  );
}
