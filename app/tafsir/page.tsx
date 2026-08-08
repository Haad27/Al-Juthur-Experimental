"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Search, Sparkles, ChevronRight, Copy, Languages, User, BookOpenText, ChevronUp, ChevronDown, X, Bot } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import TafsirTextRenderer from "@/components/tafsir/TafsirTextRenderer";
import { amiriquran, inter } from "@/app/fonts";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
import FloatingAskScholarButton from "@/components/ai/FloatingAskScholarButton";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { copyToClipboard, cn } from "@/lib/utils";

interface Author {
  id: number;
  name: string;
  authorName?: string;
  languageId: number;
  era?: string;
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

export default function TafsirPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [selectedEra, setSelectedEra] = useState<string>("All Eras");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  const [tafsirEntries, setTafsirEntries] = useState<TafsirEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [topNavVisible, setTopNavVisible] = useState<boolean>(true);
  const [currentAyahIndex, setCurrentAyahIndex] = useState<number>(0);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollYRef = useRef<number>(0);

  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);

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
                if (normalizeText(author.name).includes(authorQuery) || (author.authorName && normalizeText(author.authorName).includes(authorQuery))) {
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

  // Fetch full Surah tafsir when author or surah changes
  useEffect(() => {
    if (!activeAuthor) return;

    setLoadingEntries(true);
    fetch(`/api/tafsir?authorId=${activeAuthor.id}&surahId=${activeSurah}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setTafsirEntries(data.data);
        } else {
          setTafsirEntries([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch tafsir entries:", err);
        setTafsirEntries([]);
      })
      .finally(() => {
        setLoadingEntries(false);
      });
  }, [activeAuthor, activeSurah]);

  // Reset visible count when author or surah changes
  useEffect(() => {
    setVisibleCount(20);
  }, [activeAuthor, activeSurah]);

  // Infinite scroll observer to load more entries
  useEffect(() => {
    if (!loadMoreRef.current || tafsirEntries.length <= visibleCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, tafsirEntries.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, tafsirEntries.length, activeAuthor]);

  // Flatten all authors with their language info
  const allAuthorsWithLang = useMemo(() => {
    const list: { author: Author; language: Language }[] = [];
    languages.forEach((lang) => {
      lang.authors.forEach((auth) => {
        list.push({ author: auth, language: lang });
      });
    });
    return list;
  }, [languages]);

  // Filter authors based on search query, language, and era selection
  const filteredAuthors = useMemo(() => {
    return allAuthorsWithLang.filter(({ author, language }) => {
      const matchesLang =
        selectedLanguage === "All" ||
        language.name.toLowerCase() === selectedLanguage.toLowerCase();
      const matchesEra =
        selectedEra === "All Eras" ||
        author.era === selectedEra;
      const matchesSearch = matchesSmartSearch(author, language, searchQuery);
      return matchesLang && matchesEra && matchesSearch;
    });
  }, [allAuthorsWithLang, selectedLanguage, selectedEra, searchQuery]);

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
    if (!activeAuthor) return;
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

  // Auto-scroll to target ayah from URL param after entries load
  useEffect(() => {
    if (!urlAyah || !tafsirEntries.length || !activeAuthor) return;
    const n = parseInt(urlAyah, 10);
    if (isNaN(n)) return;
    
    if (n > visibleCount) {
      setVisibleCount(n + 10);
    }
    
    // Small delay to allow render
    const t = setTimeout(() => {
      const el = document.getElementById(`ayah-${n}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("highlighted");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [urlAyah, tafsirEntries, activeAuthor]); // Removed visibleCount to prevent infinite loops on mount

  const scrollToAyah = (num: number) => {
    if (num > visibleCount) {
      setVisibleCount(num + 10);
    }
    setTimeout(() => {
      setCurrentAyahIndex(num - 1);
      const el = document.getElementById(`ayah-${num}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const navigateAyah = useCallback((delta: number) => {
    const nextIdx = Math.max(0, Math.min(tafsirEntries.length - 1, currentAyahIndex + delta));
    
    if (nextIdx + 1 > visibleCount) {
      setVisibleCount(nextIdx + 10);
    }

    setTimeout(() => {
      const target = ayahRefs.current[nextIdx];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setCurrentAyahIndex(nextIdx);
      }
    }, 50);
  }, [currentAyahIndex, tafsirEntries.length, visibleCount]);


  // ==========================================
  // FULL READING MODE (WHEN AUTHOR IS SELECTED)
  // ==========================================
  if (activeAuthor) {
    const isArabicOrUrdu =
      activeLangName.toLowerCase().includes("arabic") ||
      activeLangName.toLowerCase().includes("urdu") ||
      activeLangName.toLowerCase().includes("persian");
      
    const isUrduText = activeLangName.toLowerCase().includes("urdu");



    // ── STANDARD MODE ──────────────────────────────────────────
    return (
      <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white ${inter.className} transition-all duration-300 ${!!aiChatContext ? "xl:pr-[450px]" : ""}`}>
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
                    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold uppercase tracking-wider shrink-0 mt-0.5">
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pt-2 border-t border-zinc-800/50">
                Surahs (1 - 114)
              </h2>
            </div>
            <div className="p-2 space-y-1">
              {SURAHS_DATA.map((surah) => {
                const isActive = surah.number === activeSurah;
                return (
                  <button
                    key={surah.number}
                    onClick={() => {
                      setActiveSurah(surah.number);
                      window.scrollTo({ top: 0, behavior: "smooth" });
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

            {/* Surah Banner Header */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 p-6 md:p-8">
              <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-400 mb-1">
                    <span>Surah {currentSurahMeta.number}</span>
                    <span>•</span>
                    <span>{currentSurahMeta.revelationType}</span>
                    <span>•</span>
                    <span>{currentSurahMeta.numberOfAyahs} Ayahs</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    {currentSurahMeta.englishName} ({currentSurahMeta.englishNameTranslation})
                  </h2>
                </div>
                <div className="text-right">
                  <h3 className={`font-mushaf-uthmani text-4xl md:text-[2.75rem] text-emerald-300`}>
                    {currentSurahMeta.name}
                  </h3>
                </div>
              </div>

              {currentSurahMeta.number !== 9 && (
                <div className="mt-6 pt-6 border-t border-zinc-800/60 text-center">
                  <p className={`font-mushaf-uthmani text-[1.65rem] md:text-4xl text-amber-100/90 tracking-wide leading-loose`}>
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            {loadingEntries ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="size-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Loading Tafsir for Surah {currentSurahMeta.englishName}...</p>
              </div>
            ) : tafsirEntries.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-xl p-8">
                <p className="text-zinc-400">No Tafsir entries found for this Surah in this collection.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tafsirEntries.slice(0, visibleCount).map((entry, idx) => {
                  const ayahNumber = entry.ayah?.numberInSurah || idx + 1;
                  const arabicText = entry.ayah?.text && entry.ayah.text !== "Arabic Text" ? entry.ayah.text : null;
                  return (
                    <div
                      key={entry.id || idx}
                      id={`ayah-${ayahNumber}`}
                      data-ayah-idx={idx}
                      ref={(el) => { ayahRefs.current[idx] = el; }}
                      className="border border-emerald-500/20 bg-zinc-900/40 rounded-xl p-5 md:p-7 transition-all hover:border-emerald-500/50 space-y-6 scroll-mt-24"
                    >
                      {/* Top Ayah Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/60 pb-4 gap-4">
                        <div className="flex items-center gap-3">
                          <span className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {activeSurah}:{ayahNumber}
                          </span>
                          <span className="text-sm font-semibold text-zinc-300">Ayah {ayahNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
                              copyToClipboard(cleanText, "Tafsir explanation copied to clipboard!");
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition text-xs font-medium text-zinc-300"
                            title="Copy Tafsir"
                          >
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                          </button>
                          {activeLangName !== 'English' && (
                            <button
                              onClick={() => {
                                const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
                                sessionStorage.setItem("ai_translator_input", cleanText);
                                router.push("/ai");
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition text-xs font-medium text-emerald-400"
                              title="Translate to English"
                            >
                              <Languages className="size-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Translate to English</span>
                              <span className="sm:hidden">Translate</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Arabic Verse */}
                      {arabicText && (
                        <div className="py-2">
                          <p className={`font-mushaf-uthmani text-[1.65rem] md:text-4xl text-right leading-loose text-amber-100 font-normal`} dir="rtl" style={{ lineHeight: '2.4' }}>
                            {arabicText}
                          </p>
                        </div>
                      )}

                      {/* Tafsir Text */}
                      <div className="pt-2 border-t border-zinc-800/40">
                        <TafsirTextRenderer text={entry.text} isArabic={isArabicOrUrdu} isUrdu={isUrduText} />
                      </div>

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
                  );
                })}
                {visibleCount < tafsirEntries.length && (
                  <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center">
                    <div className="size-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar: Compact Ayah Jump Index */}
          <aside className="hidden md:flex flex-col w-16 lg:w-20 shrink-0 border-l border-zinc-800/60 bg-zinc-950/50 sticky top-0 h-screen overflow-y-auto no-scrollbar py-6">
            <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest text-center mb-6">Ayahs</div>
            <div className="flex flex-col items-center gap-2">
              {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => {
                return (
                  <button
                    key={num}
                    id={`ayah-tracker-${num}`}
                    onClick={() => scrollToAyah(num)}
                    className="size-8 lg:size-9 rounded-full flex items-center justify-center text-[10px] lg:text-[11px] font-semibold transition-all shrink-0 text-zinc-500 hover:bg-emerald-500 hover:text-zinc-950 hover:font-bold hover:shadow-md hover:shadow-emerald-500/20 border border-transparent"
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
      </div>
    );
  }

  // ==========================================
  // TAFSIR LIBRARY VIEW (GRID OF COLLECTION CARDS)
  // ==========================================
  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-36 md:pb-24 ${inter.className}`}>
      
      {/* Top Navigation Bar (Library View) */}
      <div className="sticky top-0 z-40 bg-zinc-950/50 backdrop-blur-3xl border-b border-zinc-800/80 px-4 md:px-8 py-3 shadow-sm">
        <div className="max-w-[1700px] mx-auto relative flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Hero Header */}
      <div className="relative pt-12 pb-8 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="absolute left-10 top-10 size-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <Sparkles className="size-3.5" />
              <span>Comprehensive Library</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Explore All Tafsirs
            </h1>
            <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
              Select any classical or contemporary Quranic commentary below to enter full reading mode.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by author, tafsir name, language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Language Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-3 no-scrollbar border-b border-zinc-800/60">
          <span className="text-xs font-semibold text-zinc-400 pr-2 whitespace-nowrap flex items-center gap-1.5">
            <Languages className="size-3.5 text-emerald-400" /> Language:
          </span>
          <button
            onClick={() => setSelectedLanguage("All")}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
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
              className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedLanguage === lang.name
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {lang.name} ({lang.authors.length})
            </button>
          ))}
        </div>

        {/* Era Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-5 no-scrollbar border-b border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 pr-2 whitespace-nowrap flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-emerald-400" /> Era:
          </span>
          {ERAS.map((eraName) => {
            const count = eraName === "All Eras" 
              ? allAuthorsWithLang.length 
              : allAuthorsWithLang.filter(a => a.author.era === eraName).length;
            return (
              <button
                key={eraName}
                onClick={() => setSelectedEra(eraName)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedEra === eraName
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                {eraName.replace(" & Contemporary", "")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Tafsir Containers (1 col -> 2 -> 3 -> 4 cols on laptop view) */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 py-6">
        {filteredAuthors.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
            <p className="text-zinc-400 text-sm">No Tafsir books found matching your filter selections.</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {filteredAuthors.map(({ author, language }, index) => (
              <div
                key={`${language.id}-${author.id}`}
                onClick={() => {
                  setActiveAuthor(author);
                  setActiveLangName(language.name);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="relative overflow-hidden border border-emerald-500/50 hover:border-emerald-500 bg-zinc-900/40 group cursor-pointer rounded-xl h-[112px] backdrop-blur-md px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
              >
                {/* Giant Faded Watermark Number */}
                <div className="absolute -right-2 -bottom-4 text-[75px] font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors duration-500 pointer-events-none select-none leading-none">
                  {index + 1}
                </div>

                <div className="relative z-10 flex items-start justify-between gap-3 min-w-0">
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

                  {/* Quran Logo Icon on right */}
                  <div className="text-right shrink-0">
                    <LogoIcon className="size-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                {/* Methodology Badges */}
                {author.tags && author.tags.length > 0 && (
                  <div className="relative z-10 flex items-center gap-1.5 pt-1 border-t border-zinc-800/60 overflow-hidden">
                    {author.tags.slice(0, 1).map((tag) => (
                      <span
                        key={tag.id}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border truncate max-w-[170px] ${getTagColorClass(tag.color)}`}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {author.tags.length > 1 && (
                      <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                        +{author.tags.length - 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
