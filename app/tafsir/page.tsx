"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Search, Sparkles, ChevronRight, Copy, Languages } from "lucide-react";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import { SURAHS_DATA, SurahMeta } from "@/lib/surahsData";
import TafsirTextRenderer from "@/components/tafsir/TafsirTextRenderer";
import { amiriquran, inter } from "@/app/fonts";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Author {
  id: number;
  name: string;
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

export default function TafsirPage() {
  const router = useRouter();
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
        }
      })
      .catch((err) => console.error("Failed to fetch languages:", err));
  }, []);

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
      const matchesSearch =
        author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (author.tags?.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesLang && matchesEra && matchesSearch;
    });
  }, [allAuthorsWithLang, selectedLanguage, selectedEra, searchQuery]);

  const currentSurahMeta = SURAHS_DATA.find((s) => s.number === activeSurah) || SURAHS_DATA[0];

  const scrollToAyah = (num: number) => {
    const el = document.getElementById(`ayah-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // ==========================================
  // FULL READING MODE (WHEN AUTHOR IS SELECTED)
  // ==========================================
  if (activeAuthor) {
    const isArabicOrUrdu =
      activeLangName.toLowerCase().includes("arabic") ||
      activeLangName.toLowerCase().includes("urdu") ||
      activeLangName.toLowerCase().includes("persian");

    return (
      <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white ${inter.className}`}>
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/80 px-4 md:px-8 py-4">
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveAuthor(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-sm font-medium transition-all text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                <span>All Tafsirs</span>
              </button>
              
              <div className="h-4 w-px bg-zinc-800 hidden md:block mx-2" />
              
              <div>
                <h1 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <span className="truncate max-w-[150px] sm:max-w-none">{activeAuthor.name}</span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-normal">
                    {activeLangName}
                  </span>
                </h1>
              </div>
            </div>

            {/* Mobile Navigation (Surah Dropdown & Ayah Scroller) */}
            <div className="md:hidden flex flex-col gap-3 w-full">
              {/* Surah Dropdown with Green Arrow & Background */}
              <div className="relative w-full">
                <select
                  value={activeSurah}
                  onChange={(e) => setActiveSurah(Number(e.target.value))}
                  className="w-full appearance-none bg-emerald-500/5 border border-emerald-500/30 rounded-lg px-3 py-2.5 text-sm text-emerald-100 font-medium focus:outline-none focus:border-emerald-400 pr-10 shadow-sm"
                >
                  {SURAHS_DATA.map((s) => (
                    <option key={s.number} value={s.number} className="bg-zinc-900 text-zinc-200">
                      {s.number}. {s.englishName} ({s.name})
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500 pointer-events-none rotate-90" />
              </div>

              {/* Horizontal Ayah Pills Scroller (Styled exactly like desktop Ayah boxes) */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
                {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => scrollToAyah(num)}
                    className="flex-shrink-0 size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs transition-all shadow-sm hover:bg-emerald-500 hover:text-zinc-950 active:scale-95"
                    title={`Jump to Ayah ${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar + Main Content + Right Ayah Navigator */}
        <div className="max-w-[1700px] mx-auto flex min-h-[calc(100vh-73px)]">
          {/* Left Sidebar: 114 Surahs (Full Height, sleek scrollbar) */}
          <aside className="hidden md:flex flex-col w-72 border-r border-zinc-800/60 bg-zinc-950/50 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto custom-scrollbar">
            <div className="p-4 border-b border-zinc-800/60 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
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
                      <div
                        className={`size-6 rounded-md flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-zinc-800/80 text-zinc-400"
                        }`}
                      >
                        {surah.number}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-zinc-200">
                          {surah.englishName}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {surah.englishNameTranslation}
                        </span>
                      </div>
                    </div>
                    <span className={`${amiriquran.className} text-base text-zinc-300`}>
                      {surah.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area: Continuous Scroll of Ayahs & Tafsir */}
          <main className="flex-1 p-4 md:p-8 space-y-8 min-w-0">
            {/* Surah Banner Header */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 p-6 md:p-8 backdrop-blur-md">
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
                  <h3 className={`${amiriquran.className} text-3xl md:text-4xl text-emerald-300`}>
                    {currentSurahMeta.name}
                  </h3>
                </div>
              </div>

              {/* Bismillah Header for all Surahs except At-Tawbah (9) */}
              {currentSurahMeta.number !== 9 && (
                <div className="mt-6 pt-6 border-t border-zinc-800/60 text-center">
                  <p className={`${amiriquran.className} text-2xl md:text-3xl text-amber-100/90 tracking-wide`}>
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
                {tafsirEntries.map((entry, idx) => {
                  const ayahNumber = entry.ayah?.numberInSurah || idx + 1;
                  const arabicText = entry.ayah?.text && entry.ayah.text !== "Arabic Text"
                    ? entry.ayah.text
                    : null;

                  return (
                    <div
                      key={entry.id || idx}
                      id={`ayah-${ayahNumber}`}
                      className="border border-zinc-800/80 bg-zinc-900/30 rounded-xl p-5 md:p-7 backdrop-blur-md transition-all hover:border-zinc-700/80 space-y-6 scroll-mt-24"
                    >
                      {/* Top Ayah Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/60 pb-4 gap-4">
                        <div className="flex items-center gap-3">
                          <span className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {activeSurah}:{ayahNumber}
                          </span>
                          <span className="text-sm font-semibold text-zinc-300">
                            Ayah {ayahNumber}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
                              navigator.clipboard.writeText(cleanText);
                              toast("Copied Tafsir explanation to clipboard!", { className: "bg-zinc-800 text-white border-zinc-700" });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition text-xs font-medium text-zinc-300"
                            title="Copy Tafsir"
                          >
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
                              sessionStorage.setItem("ai_translator_input", cleanText);
                              router.push("/ai");
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition text-xs font-medium text-emerald-400"
                            title="Translate to English"
                          >
                            <Languages className="size-3.5" />
                            <span className="hidden sm:inline">Translate to English</span>
                            <span className="sm:hidden">Translate</span>
                          </button>
                        </div>
                      </div>

                      {/* Quran Arabic Verse Text (if available) */}
                      {arabicText && (
                        <div className="py-2">
                          <p
                            className={`${amiriquran.className} text-2xl md:text-3xl text-right leading-loose text-amber-100 font-normal`}
                            dir="rtl"
                          >
                            {arabicText}
                          </p>
                        </div>
                      )}

                      {/* Tafsir Exegesis Text (Parsed Cleanly) */}
                      <div className="pt-2 border-t border-zinc-800/40">
                        <TafsirTextRenderer text={entry.text} isArabic={isArabicOrUrdu} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Right Sidebar: Quick Ayah Jump Grid (Exact match for user screenshot) */}
          <aside className="hidden xl:flex flex-col w-80 border-l border-zinc-800/60 bg-zinc-950/50 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto custom-scrollbar p-5">
            {/* Top Surah Card */}
            <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-xl p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {currentSurahMeta.number}
                </span>
                <span className="font-bold text-white text-base">
                  {currentSurahMeta.englishName}
                </span>
              </div>
              <span className={`${amiriquran.className} text-2xl text-zinc-300`}>
                {currentSurahMeta.name}
              </span>
            </div>

            {/* Grid of Ayah Numbers */}
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: currentSurahMeta.numberOfAyahs }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => scrollToAyah(num)}
                  className="bg-zinc-900/80 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 rounded-lg py-3 text-center font-bold text-sm border border-zinc-800 transition-all duration-150 cursor-pointer shadow-sm hover:scale-105"
                  title={`Jump to Ayah ${num}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ==========================================
  // TAFSIR LIBRARY VIEW (GRID OF COLLECTION CARDS)
  // ==========================================
  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-24 ${inter.className}`}>
      
      {/* Top Navigation Bar (Library View) */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/80 px-4 md:px-8 py-3">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo and App Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoIcon className="text-white size-6 hidden md:block" />
              <p className="font-bold text-lg md:text-xl text-white hidden md:block">Al-Juthur</p>
            </Link>
          </div>

          {/* Desktop Full Navigation (Same as Homepage) */}
          <nav className="hidden lg:flex items-center gap-6 text-zinc-400 text-sm">
            <Link href="/" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              Home
            </Link>
            <Link href="/tafsir" className="cursor-pointer text-white font-medium">
              Tafsir
            </Link>
            <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition">
              Lexicon
            </Link>
            <Link href="/ai" className="cursor-pointer hover:text-gray-300 transition">
              AI Translator
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
              placeholder="Search author or language..."
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

      {/* Grid of Tafsir Containers (Matches Homepage Surah Cards exactly + Methodology Badges) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {filteredAuthors.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
            <p className="text-zinc-400 text-sm">No Tafsir books found matching your filter selections.</p>
          </div>
        ) : (
          <div className="w-full grid xl:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">
            {filteredAuthors.map(({ author, language }, index) => (
              <div
                key={`${language.id}-${author.id}`}
                onClick={() => {
                  setActiveAuthor(author);
                  setActiveLangName(language.name);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="relative overflow-hidden border border-emerald-500/50 hover:border-emerald-500 bg-zinc-900/40 group cursor-pointer rounded-xl h-full backdrop-blur-md px-5 py-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
              >
                {/* Giant Faded Watermark Number */}
                <div className="absolute -right-2 -bottom-4 text-[80px] font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors duration-500 pointer-events-none select-none leading-none">
                  {index + 1}
                </div>

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex flex-col space-y-1">
                    <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                      {author.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">{language.name}</span>
                      {author.era && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400 text-[11px] truncate max-w-[170px]" title={author.era}>
                            {author.era.replace(" & Contemporary", "")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quran Logo Icon on right */}
                  <div className="text-right shrink-0">
                    <LogoIcon className="size-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                {/* Methodology Badges */}
                {author.tags && author.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/60">
                    {author.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTagColorClass(tag.color)}`}
                      >
                        {tag.name}
                      </span>
                    ))}
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
