"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Play,
  Volume2,
  Compass,
  Bookmark,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Sun,
  CloudRain,
  Feather,
  Heart,
  Eye,
  Smile,
} from "lucide-react";
import { amiri, amiriquran, inter, lora } from "@/app/fonts";
import AppHeader from "@/components/layout/AppHeader";
import MobileSheet from "@/components/sidebar/MobileSheet";
import MenuIcon from "@/components/svg/icons/MenuIcon";
import TafsirBookCover from "@/components/tafsir/TafsirBookCover";
import MoodReflectionModal from "@/components/home/MoodReflectionModal";
import {
  TOP_SHELF_TAFSIRS,
  ALL_TIME_BESTSELLERS,
  TAFSIR_ROADMAPS,
  MOOD_REFLECTIONS,
  METHODOLOGY_COLLECTIONS,
  POPULAR_AUDIO_SURAHS,
  MoodReflection,
  TafsirBookItem,
} from "@/lib/homeData";
import {
  getLastReadTafsir,
  getRecentQuranReading,
  LastReadTafsir,
  RecentQuranReading,
} from "@/lib/readerStorage";
import { useAudioStore } from "@/lib/stores/audioStore";
import { SURAHS_DATA } from "@/lib/surahsData";

export default function DiscoveryHomePage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadTafsir, setLastReadTafsir] = useState<LastReadTafsir | null>(null);
  const [recentQuran, setRecentQuran] = useState<RecentQuranReading | null>(null);

  // Top shelf active index
  const [topShelfIndex, setTopShelfIndex] = useState(0);

  // Roadmap active tab: beginner | intermediate | advanced
  const [activeRoadmap, setActiveRoadmap] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  // Selected mood modal
  const [activeMood, setActiveMood] = useState<MoodReflection | null>(null);

  // Bestsellers shelf horizontal scroll
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const moodsRef = useRef<HTMLDivElement>(null);

  // Audio store state
  const { currentSurah, isPlaying } = useAudioStore();

  useEffect(() => {
    const refreshStorage = () => {
      setLastReadTafsir(getLastReadTafsir());
      setRecentQuran(getRecentQuranReading());
    };
    refreshStorage();
    window.addEventListener("focus", refreshStorage);
    window.addEventListener("storage", refreshStorage);
    return () => {
      window.removeEventListener("focus", refreshStorage);
      window.removeEventListener("storage", refreshStorage);
    };
  }, []);

  const scrollShelf = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    const amount = direction === "left" ? -320 : 320;
    ref.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const currentTopShelf = TOP_SHELF_TAFSIRS[topShelfIndex] || TOP_SHELF_TAFSIRS[0];

  const getMoodIcon = (iconName: string) => {
    switch (iconName) {
      case "rain":
        return <CloudRain className="size-6 text-accent" />;
      case "leaf":
        return <Feather className="size-6 text-accent" />;
      case "sun":
        return <Sun className="size-6 text-accent" />;
      case "drop":
        return <Heart className="size-6 text-accent" />;
      case "telescope":
        return <Eye className="size-6 text-accent" />;
      case "hands":
        return <Smile className="size-6 text-accent" />;
      default:
        return <Sparkles className="size-6 text-accent" />;
    }
  };

  return (
    <>
      <MobileSheet
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        searchQuery=""
        setSearchQuery={() => {}}
        surahs={SURAHS_DATA}
      />

      <AppHeader
        rightSlot={
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
        }
      />

      <main className={`mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 md:pb-20 space-y-16 ${inter.className}`}>
        {/* =========================================================================
            1. HERO & GREETING
           ========================================================================= */}
        <section className="relative pt-2 pb-1">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="size-3.5" />
                <span>Al-Juthur Tafsir & Qur'an Hub</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                Salam, let's get started with understanding the Qur'an.
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                A blessed Book revealed so that you might reflect upon its verses — [38:29]
              </p>
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/tafsir"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs sm:text-sm font-semibold transition"
              >
                <Compass className="size-4" />
                <span>Browse 120+ Tafsirs</span>
              </Link>
              <Link
                href="/quran"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground text-xs sm:text-sm font-semibold transition"
              >
                <BookOpen className="size-4" />
                <span>All Surahs</span>
              </Link>
            </div>
          </div>

          {/* Dynamic Continue Reading Banner (if user has active history) */}
          {(lastReadTafsir || recentQuran) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {lastReadTafsir && (
                <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-accent tracking-wider flex items-center gap-1">
                        <Clock className="size-3" /> Continue Tafsir
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {lastReadTafsir.surahName} · Ayah {lastReadTafsir.ayahNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {lastReadTafsir.authorName}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/tafsir?author=${lastReadTafsir.authorId}&surah=${lastReadTafsir.surahId}&ayah=${lastReadTafsir.ayahNumber}`}
                    className="shrink-0 p-2 rounded-full bg-accent/15 text-accent hover:bg-accent hover:text-accent-foreground transition"
                    title="Resume Tafsir"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}

              {recentQuran && (
                <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground shrink-0">
                      <span className="font-mono text-xs font-bold">{recentQuran.number}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                        <Bookmark className="size-3" /> Continue Quran
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {recentQuran.number}. {recentQuran.englishName}
                        {recentQuran.lastReadAyah && ` (Ayah ${recentQuran.lastReadAyah})`}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {recentQuran.englishNameTranslation}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={
                      recentQuran.lastReadAyah && recentQuran.lastReadAyah > 1
                        ? `/surah/${recentQuran.number}?ayah=${recentQuran.lastReadAyah}`
                        : `/surah/${recentQuran.number}`
                    }
                    className="shrink-0 p-2 rounded-full bg-muted text-foreground hover:bg-accent/20 hover:text-accent transition"
                    title="Resume Surah"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =========================================================================
            2. TOP-SHELF (Handpicked Classical Previews)
           ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Top-shelf
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Handpicked previews of foundational Quranic exegeses
              </p>
            </div>
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setTopShelfIndex((prev) => (prev > 0 ? prev - 1 : TOP_SHELF_TAFSIRS.length - 1))
                }
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Previous featured title"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() =>
                  setTopShelfIndex((prev) => (prev < TOP_SHELF_TAFSIRS.length - 1 ? prev + 1 : 0))
                }
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Next featured title"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Top-Shelf Showcase Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8 transition-all">
            <div className="flex flex-col-reverse lg:flex-row lg:items-center justify-between gap-8">
              {/* Left Column: Details */}
              <div className="space-y-4 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-[11px] font-bold uppercase tracking-wider">
                    {currentTopShelf.badge || "Foundational Masterpiece"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentTopShelf.era}
                  </span>
                </div>

                <div>
                  <h3 className={`${lora.className} text-2xl sm:text-3xl font-bold text-foreground leading-tight`}>
                    {currentTopShelf.title}
                  </h3>
                  {currentTopShelf.arabicTitle && (
                    <p className={`${amiri.className} text-base sm:text-lg text-arabic mt-1 leading-snug`}>
                      {currentTopShelf.arabicTitle}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                    By {currentTopShelf.author}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-reading leading-relaxed">
                  {currentTopShelf.description}
                </p>

                {/* Key feature pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentTopShelf.features.map((feat) => (
                    <span
                      key={feat}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-[11px] font-medium border border-border"
                    >
                      <CheckCircle2 className="size-3 text-accent" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() =>
                      router.push(`/tafsir?author=${currentTopShelf.id}&surah=${currentTopShelf.recommendedSurah || 1}`)
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs sm:text-sm transition hover:opacity-90 cursor-pointer shadow-sm"
                  >
                    <span>Start Reading</span>
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/tafsir?author=${currentTopShelf.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-card hover:bg-muted border border-border text-foreground font-medium text-xs sm:text-sm transition cursor-pointer"
                  >
                    <span>View Chapters</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Tactile Book Presentation */}
              <div className="flex items-center justify-center lg:justify-end">
                <div
                  onClick={() =>
                    router.push(`/tafsir?author=${currentTopShelf.id}&surah=${currentTopShelf.recommendedSurah || 1}`)
                  }
                  className="cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                >
                  <TafsirBookCover
                    title={currentTopShelf.title}
                    arabicTitle={currentTopShelf.arabicTitle}
                    author={currentTopShelf.author}
                    era={currentTopShelf.era}
                    difficulty={currentTopShelf.difficulty}
                    coverTheme={currentTopShelf.coverTheme}
                    badge={currentTopShelf.badge}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. TAFSIR ROADMAPS (Beginner -> Intermediate -> Advanced)
           ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider">
                <Layers className="size-3.5" />
                <span>Structured Pathways</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mt-1">
                Tafsir Roadmap
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Strictly vetted, non-controversial pathways from first steps to monumental classical encyclopedias
              </p>
            </div>

            {/* Pathway Selector Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-card border border-border w-fit">
              {(["beginner", "intermediate", "advanced"] as const).map((level) => {
                const isActive = activeRoadmap === level;
                return (
                  <button
                    key={level}
                    onClick={() => setActiveRoadmap(level)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                      isActive
                        ? "bg-accent/15 text-accent border border-accent/25 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {level === "beginner" ? "Beginner (The Best Start)" : level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Roadmap Description Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/25">
                {TAFSIR_ROADMAPS[activeRoadmap].badge}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {TAFSIR_ROADMAPS[activeRoadmap].title}
              </h3>
            </div>
            <p className="text-xs text-reading leading-relaxed">
              {TAFSIR_ROADMAPS[activeRoadmap].tagline}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Recommended for:</strong>{" "}
              {TAFSIR_ROADMAPS[activeRoadmap].targetAudience}
            </p>
          </div>

          {/* Roadmap Books Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TAFSIR_ROADMAPS[activeRoadmap].books.map((book, idx) => (
              <div
                key={book.id}
                onClick={() => router.push(`/tafsir?author=${book.id}&surah=1`)}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 hover:border-accent/40 transition group cursor-pointer"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Step index badge */}
                  <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">
                      Step {idx + 1}
                    </span>
                    <span className="text-accent font-medium">{book.badge}</span>
                  </div>

                  <TafsirBookCover
                    title={book.title}
                    arabicTitle={book.arabicTitle}
                    author={book.author}
                    era={book.era}
                    difficulty={book.difficulty}
                    coverTheme={book.coverTheme}
                    size="md"
                  />

                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-accent transition line-clamp-1">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {book.author}
                    </p>
                  </div>

                  <p className="text-[11px] text-reading line-clamp-3 leading-relaxed text-left">
                    {book.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-accent font-semibold">
                  <span>Start with Step {idx + 1}</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            4. ALL-TIME BESTSELLERS / MOST READ CLASSICAL TAFSIRS
           ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/tafsir"
                className="group inline-flex items-center gap-1.5 text-xl sm:text-2xl font-bold text-foreground tracking-tight hover:text-accent transition"
              >
                <span>All-Time Bestsellers</span>
                <ChevronRight className="size-5 group-hover:translate-x-1 transition-transform text-accent" />
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground">
                The most revered and studied Quranic commentaries throughout history
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollShelf(bestsellersRef, "left")}
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Scroll bestsellers left"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => scrollShelf(bestsellersRef, "right")}
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Scroll bestsellers right"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Bookshelf */}
          <div
            ref={bestsellersRef}
            className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth"
          >
            {ALL_TIME_BESTSELLERS.map((book) => (
              <div
                key={`bestseller-${book.id}`}
                onClick={() =>
                  router.push(`/tafsir?author=${book.id}&surah=${book.recommendedSurah || 1}`)
                }
                className="flex flex-col justify-between shrink-0 w-[170px] sm:w-[190px] rounded-xl border border-border bg-card p-3 sm:p-3.5 hover:border-accent/50 transition cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center space-y-2.5">
                  <TafsirBookCover
                    title={book.title}
                    arabicTitle={book.arabicTitle}
                    author={book.author}
                    difficulty={book.difficulty}
                    coverTheme={book.coverTheme}
                    badge={book.badge}
                    size="md"
                  />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-accent transition line-clamp-1">
                      {book.title}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {book.author}
                    </p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[100px]">{book.category}</span>
                  <ArrowRight className="size-3 text-accent group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            5. MATCH YOUR MOOD (Thematic Quranic Reflections)
           ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Match Your Mood
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Spiritual themes and classical wisdom aligned with what your heart seeks today
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollShelf(moodsRef, "left")}
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Scroll moods left"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => scrollShelf(moodsRef, "right")}
                className="size-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label="Scroll moods right"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Mood Cards */}
          <div
            ref={moodsRef}
            className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth"
          >
            {MOOD_REFLECTIONS.map((m) => (
              <div
                key={m.id}
                onClick={() => setActiveMood(m)}
                className={`shrink-0 w-[240px] sm:w-[260px] p-5 rounded-2xl border bg-gradient-to-br ${m.themeClass} hover:border-accent/60 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]`}
              >
                <div className="flex items-start justify-between">
                  {getMoodIcon(m.iconName)}
                  <span className={`${amiri.className} text-sm text-arabic`}>
                    {m.arabicTitle}
                  </span>
                </div>

                <div className="space-y-1 mt-4">
                  <h3 className="text-base font-bold text-foreground group-hover:text-accent transition">
                    {m.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {m.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-medium text-accent">
                  <span>Explore Verses & Tafsir</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            6. MORE TO EXPLORE (Methodology & Genre Overlapping Cards)
           ========================================================================= */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              More to Explore
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Deep collections grouped by classical methodology and scholarly discipline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METHODOLOGY_COLLECTIONS.map((cat) => (
              <div
                key={cat.id}
                onClick={() => router.push(cat.filterHref)}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-accent/40 transition group cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2 max-w-[60%]">
                    <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/25">
                      {cat.count}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-accent transition">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cat.subtitle}
                    </p>
                  </div>

                  {/* Right: Overlapping Book Stacks */}
                  <div className="relative w-28 sm:w-36 h-28 shrink-0 flex items-center justify-end">
                    {cat.books.map((b, i) => (
                      <div
                        key={b.title}
                        className="absolute transition-transform duration-300 group-hover:scale-105"
                        style={{
                          right: `${i * 18}px`,
                          zIndex: 10 - i,
                          transform: `rotate(${i * 4 - 4}deg)`,
                        }}
                      >
                        <TafsirBookCover
                          title={b.title}
                          author={b.author}
                          coverTheme={b.coverTheme}
                          size="sm"
                          showSpineShadow={false}
                          className="w-[70px] h-[105px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-accent font-semibold">
                  <span>Explore {cat.title}</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            7. QUR'AN IN AUDIO (Quick Listening & "See all surahs" Button)
           ========================================================================= */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider">
                <Volume2 className="size-3.5" />
                <span>Daily Listening</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mt-1">
                Qur'an in Audio
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Recite and listen to essential chapters with word-by-word tracking
              </p>
            </div>

            <Link
              href="/quran"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-card hover:bg-muted border border-border text-foreground text-xs sm:text-sm font-semibold transition"
            >
              <span>See all surahs</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POPULAR_AUDIO_SURAHS.map((surah) => {
              const isCurrent = currentSurah === surah.number;
              const isPlayingThis = isCurrent && isPlaying;

              return (
                <div
                  key={`audio-surah-${surah.number}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 hover:border-accent/40 transition group"
                >
                  <div
                    onClick={() => router.push(`/surah/${surah.number}`)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1 mr-2"
                  >
                    {/* Octagonal style number badge */}
                    <div className="size-9 rounded-lg bg-muted border border-border flex items-center justify-center font-mono text-xs font-bold text-foreground group-hover:border-accent/40 group-hover:text-accent transition shrink-0">
                      {surah.number}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-accent transition">
                        {surah.englishName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {surah.englishTranslation} · {surah.verses} verses
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`${amiriquran.className} text-base text-arabic hidden sm:inline`}>
                      {surah.name}
                    </span>
                    <button
                      onClick={() => {
                        if (isCurrent) {
                          togglePlay();
                        } else {
                          playSurah(surah.number);
                        }
                      }}
                      className="size-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition cursor-pointer shadow-sm"
                      title={isPlayingThis ? "Pause" : "Play Recitation"}
                    >
                      {isPlayingThis ? (
                        <span className="size-3 bg-background rounded-xs" />
                      ) : (
                        <Play className="size-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prominent Large Pill Button: See all surahs */}
          <div className="flex justify-center pt-2">
            <Link
              href="/quran"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-card hover:bg-muted border border-border text-foreground text-sm font-semibold transition hover:border-accent/50 shadow-xs"
            >
              <span>Explore all 114 Surahs</span>
              <ArrowRight className="size-4 text-accent" />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            8. AL-JUTHUR SPOTLIGHT BANNER (120+ Tafsirs Engine)
           ========================================================================= */}
        <section className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-card via-card to-muted p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 text-[10px] font-extrabold tracking-widest uppercase">
                AL-JUTHUR SPOTLIGHT
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                120+ Tafsirs in 33 Languages, 13 Classical Lexicons
              </h3>
              <p className="text-xs sm:text-sm text-reading leading-relaxed">
                Compare classical and modern commentaries side-by-side, analyze triliteral Arabic roots across historical lexicons (Lisan al-Arab, Taj al-Arus, Lane's Lexicon), and synthesize insights with our scholarly AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/tafsir"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold transition hover:opacity-90"
              >
                <span>Explore Full Library</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/lexicon"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-card hover:bg-muted border border-border text-foreground text-xs sm:text-sm font-medium transition"
              >
                <span>Arabic Lexicons</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Mood Reflection Modal */}
      <MoodReflectionModal mood={activeMood} onClose={() => setActiveMood(null)} />
    </>
  );
}
