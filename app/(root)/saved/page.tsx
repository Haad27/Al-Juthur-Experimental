"use client";

import Link from "next/link";
import { 
  Pin, 
  X, 
  BookOpen, 
  Bookmark, 
  Sparkles, 
  History, 
  ArrowRight, 
  Copy, 
  Bot, 
  Compass, 
  ArrowLeft,
  Search,
  BookOpenText,
  User,
  Clock,
  Trash2
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  getLastReadTafsir, 
  getSavedTafsirs, 
  removeSavedTafsir, 
  togglePinSavedTafsir, 
  getSavedScholarAnswers, 
  removeSavedScholarAnswer, 
  togglePinScholarAnswer,
  getReadingHistory,
  LastReadTafsir,
  SavedTafsirItem,
  SavedScholarAnswer,
  ReadingHistoryItem
} from "@/lib/readerStorage";
import { copyToClipboard, cn } from "@/lib/utils";
import { toast } from "sonner";
import AppHeader from "@/components/layout/AppHeader";

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  surahNumber: number;
  translation: string;
  pinned?: boolean;
}

type TabType = "tafsirs" | "ayahs" | "scholar" | "history";
type SortOption = "pinned" | "surah" | "ayah" | "recent";

export default function SavedPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("tafsirs");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("pinned");

  // State
  const [lastRead, setLastRead] = useState<LastReadTafsir | null>(null);
  const [savedAyahs, setSavedAyahs] = useState<Ayah[]>([]);
  const [savedTafsirs, setSavedTafsirs] = useState<SavedTafsirItem[]>([]);
  const [savedScholarAnswers, setSavedScholarAnswers] = useState<SavedScholarAnswer[]>([]);
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([]);

  // Load all local data on mount
  useEffect(() => {
    setLastRead(getLastReadTafsir());
    setSavedTafsirs(getSavedTafsirs());
    setSavedScholarAnswers(getSavedScholarAnswers());
    setReadingHistory(getReadingHistory());

    const res = localStorage.getItem("saved-ayahs");
    if (res) {
      try {
        setSavedAyahs(JSON.parse(res));
      } catch {
        console.error("Invalid saved ayah data");
      }
    }
  }, []);

  // Handlers for Ayahs
  const updateAyahStorage = (updated: Ayah[]) => {
    localStorage.setItem("saved-ayahs", JSON.stringify(updated));
    setSavedAyahs(updated);
  };

  const handleRemoveAyah = (number: number) => {
    const updated = savedAyahs.filter((ayah) => ayah.number !== number);
    updateAyahStorage(updated);
    toast.info("Ayah removed from saved");
  };

  const togglePinAyah = (number: number) => {
    const updated = savedAyahs.map((ayah) =>
      ayah.number === number ? { ...ayah, pinned: !ayah.pinned } : ayah
    );
    updateAyahStorage(updated);
  };

  // Handlers for Tafsirs
  const handleRemoveTafsir = (id: string) => {
    removeSavedTafsir(id);
    setSavedTafsirs(getSavedTafsirs());
    toast.info("Tafsir entry removed from saved");
  };

  const handleTogglePinTafsir = (id: string) => {
    togglePinSavedTafsir(id);
    setSavedTafsirs(getSavedTafsirs());
  };

  // Handlers for Scholar Notes
  const handleRemoveScholar = (id: string) => {
    removeSavedScholarAnswer(id);
    setSavedScholarAnswers(getSavedScholarAnswers());
    toast.info("Scholar note removed");
  };

  const handleTogglePinScholar = (id: string) => {
    togglePinScholarAnswer(id);
    setSavedScholarAnswers(getSavedScholarAnswers());
  };

  // Clear reading history
  const handleClearHistory = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("aljuthur-reading-history");
      setReadingHistory([]);
      toast.info("Reading history cleared");
    }
  };

  // Filtered & Sorted Tafsirs
  const filteredTafsirs = useMemo(() => {
    let list = [...savedTafsirs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.surahName.toLowerCase().includes(q) ||
          t.authorName.toLowerCase().includes(q) ||
          t.tafsirSnippet.toLowerCase().includes(q) ||
          `${t.surahId}:${t.ayahNumber}`.includes(q)
      );
    }
    if (sortBy === "pinned") {
      return [...list.filter((t) => t.pinned), ...list.filter((t) => !t.pinned)];
    }
    if (sortBy === "surah") {
      return list.sort((a, b) => a.surahId - b.surahId);
    }
    if (sortBy === "ayah") {
      return list.sort((a, b) => a.ayahNumber - b.ayahNumber);
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [savedTafsirs, searchQuery, sortBy]);

  // Filtered & Sorted Ayahs
  const filteredAyahs = useMemo(() => {
    let list = [...savedAyahs];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.text.toLowerCase().includes(q) ||
          a.translation.toLowerCase().includes(q) ||
          `surah ${a.surahNumber}`.includes(q)
      );
    }
    if (sortBy === "pinned") {
      return [...list.filter((a) => a.pinned), ...list.filter((a) => !a.pinned)];
    }
    if (sortBy === "surah") {
      return list.sort((a, b) => a.surahNumber - b.surahNumber);
    }
    if (sortBy === "ayah") {
      return list.sort((a, b) => a.numberInSurah - b.numberInSurah);
    }
    return list.reverse();
  }, [savedAyahs, searchQuery, sortBy]);

  // Filtered Scholar Answers
  const filteredScholar = useMemo(() => {
    let list = [...savedScholarAnswers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.question.toLowerCase().includes(q) ||
          s.answer.toLowerCase().includes(q) ||
          (s.modeName && s.modeName.toLowerCase().includes(q))
      );
    }
    return [...list.filter((s) => s.pinned), ...list.filter((s) => !s.pinned)];
  }, [savedScholarAnswers, searchQuery]);

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <main className="min-h-screen w-full bg-background text-foreground pb-28">
      <AppHeader />
      <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/90 border border-border hover:border-accent/50 hover:bg-muted text-xs font-semibold text-reading hover:text-foreground transition"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Link
              href="/tafsir"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 text-xs font-semibold text-accent transition"
            >
              <BookOpenText className="size-4" />
              <span>Tafsir Reader</span>
            </Link>
          </div>
        </div>

        {/* Profile / Reading Progress Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-background p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
                <Bookmark className="size-3" />
                Personal Quran & Tafsir Library
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Saved Knowledge & Progress
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Continue your daily reading streak, review bookmarked exegesis, and revisit your scholarly AI inquiries.
              </p>
            </div>

            {/* Resume Last Read Card */}
            {lastRead && (
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-card border border-accent/40 shadow-md sm:min-w-[260px]">
                <div className="flex items-center justify-between text-[11px] font-semibold text-accent uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> Last Read
                  </span>
                  <span className="text-muted-foreground lowercase font-normal">{timeAgo(lastRead.timestamp)}</span>
                </div>
                <div className="font-bold text-foreground text-sm sm:text-base">
                  {lastRead.surahName} : Ayah {lastRead.ayahNumber}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {lastRead.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                </p>
                <Link
                  href={`/tafsir?author=${lastRead.authorId}&surah=${lastRead.surahId}&ayah=${lastRead.ayahNumber}`}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs shadow-sm transition"
                >
                  <span>Resume Reading</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-card/70 border border-border flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpenText className="size-3.5 text-accent" /> Saved Tafsirs
            </span>
            <span className="text-xl sm:text-2xl font-bold text-foreground">{savedTafsirs.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/70 border border-border flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-accent" /> Saved Ayahs
            </span>
            <span className="text-xl sm:text-2xl font-bold text-foreground">{savedAyahs.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/70 border border-border flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" /> Scholar Notes
            </span>
            <span className="text-xl sm:text-2xl font-bold text-foreground">{savedScholarAnswers.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-card/70 border border-border flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <History className="size-3.5 text-accent" /> Recent Reads
            </span>
            <span className="text-xl sm:text-2xl font-bold text-foreground">{readingHistory.length}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("tafsirs")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0",
                activeTab === "tafsirs"
                  ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                  : "bg-card/90 border border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <BookOpenText className="size-4" />
              <span>Saved Tafsirs ({savedTafsirs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("ayahs")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0",
                activeTab === "ayahs"
                  ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                  : "bg-card/90 border border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <BookOpen className="size-4" />
              <span>Saved Ayahs ({savedAyahs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("scholar")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0",
                activeTab === "scholar"
                  ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                  : "bg-card/90 border border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Sparkles className="size-4" />
              <span>Scholar Q&A ({savedScholarAnswers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0",
                activeTab === "history"
                  ? "bg-accent text-accent-foreground shadow-md shadow-sm"
                  : "bg-card/90 border border-border text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <History className="size-4" />
              <span>Reading History</span>
            </button>
          </div>

          {/* Search Bar and Sort */}
          {activeTab !== "history" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search saved..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/50"
                />
              </div>

              {(activeTab === "tafsirs" || activeTab === "ayahs") && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs text-reading focus:outline-none focus:border-accent/50 shrink-0"
                >
                  <option value="pinned">Pinned First</option>
                  <option value="recent">Most Recent</option>
                  <option value="surah">By Surah</option>
                  <option value="ayah">By Ayah</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Saved Tafsirs */}
        {activeTab === "tafsirs" && (
          <div className="space-y-4">
            {filteredTafsirs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredTafsirs.map((t) => (
                  <div
                    key={t.id}
                    className="relative rounded-2xl border border-border bg-card/70 p-5 sm:p-6 transition hover:border-accent/40 space-y-4 group"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-6 px-2 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                          {t.surahId}:{t.ayahNumber}
                        </span>
                        <span className="text-sm font-bold text-foreground">{t.surahName}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <User className="size-3 text-accent" />
                          {t.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                        </span>
                        {t.langName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                            {t.langName}
                          </span>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTogglePinTafsir(t.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition cursor-pointer",
                            t.pinned
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={t.pinned ? "Unpin Tafsir" : "Pin Tafsir to Top"}
                        >
                          <Pin className={cn("size-3.5", t.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => copyToClipboard(t.fullTafsirText || t.tafsirSnippet, "Tafsir copied to clipboard!")}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted transition cursor-pointer"
                          title="Copy Tafsir"
                        >
                          <Copy className="size-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveTafsir(t.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-muted transition cursor-pointer"
                          title="Remove from Saved"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Arabic Text if present */}
                    {t.arabicText && (
                      <p className="font-mushaf-indopak-16 text-lg sm:text-xl text-right leading-loose text-amber-100/90" dir="rtl">
                        {t.arabicText}
                      </p>
                    )}

                    {/* Tafsir Snippet */}
                    <div className="text-xs sm:text-sm text-reading leading-relaxed max-h-36 overflow-hidden relative">
                      <p className="line-clamp-4">{t.tafsirSnippet}...</p>
                    </div>

                    {/* Bottom Link to Reader */}
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" /> Saved {timeAgo(t.timestamp)}
                      </span>
                      <Link
                        href={`/tafsir?author=${t.authorId}&surah=${t.surahId}&ayah=${t.ayahNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted hover:bg-accent/15 hover:text-accent hover:border-accent/40 border border-border text-xs font-semibold text-foreground transition"
                      >
                        <span>Open in Tafsir Reader</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/40 border border-border rounded-3xl space-y-4">
                <BookOpenText className="size-10 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-reading">No saved Tafsir commentaries yet.</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    While exploring the Tafsir reader, click the bookmark icon on any verse to store its scholarly commentary here for daily reading.
                  </p>
                </div>
                <Link
                  href="/tafsir"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-sm transition"
                >
                  <BookOpenText className="size-4" />
                  <span>Browse Tafsir Reader</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Saved Ayahs */}
        {activeTab === "ayahs" && (
          <div className="space-y-4">
            {filteredAyahs.length > 0 ? (
              <div className="space-y-4">
                {filteredAyahs.map((ayah) => (
                  <div
                    key={ayah.number}
                    className="relative rounded-2xl border border-border bg-card/70 p-5 transition hover:border-accent/40 space-y-3 group"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="h-6 px-2 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                        Surah {ayah.surahNumber} : Ayah {ayah.numberInSurah}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePinAyah(ayah.number)}
                          className={cn(
                            "p-1.5 rounded-lg transition cursor-pointer",
                            ayah.pinned
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={ayah.pinned ? "Unpin Ayah" : "Pin Ayah"}
                        >
                          <Pin className={cn("size-3.5", ayah.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => handleRemoveAyah(ayah.number)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-muted transition cursor-pointer"
                          title="Remove Ayah"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <Link
                      href={`/surah/${ayah.surahNumber}?ayah=${ayah.numberInSurah}`}
                      className="block space-y-2 hover:opacity-90 transition"
                    >
                      <p className="font-mushaf-indopak-16 text-lg sm:text-2xl text-right leading-loose text-amber-100" dir="rtl">
                        {ayah.text}
                      </p>
                      <p className="text-xs sm:text-sm text-reading leading-relaxed">{ayah.translation}</p>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/40 border border-border rounded-3xl space-y-4">
                <BookOpen className="size-10 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-reading">No saved ayahs yet.</p>
                  <p className="text-xs text-muted-foreground">Bookmark any Quranic verse to quickly study it later.</p>
                </div>
                <Link
                  href="/surah/1"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-5 py-2.5 rounded-xl text-xs transition"
                >
                  <span>Start Reading Quran</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Scholar Answers */}
        {activeTab === "scholar" && (
          <div className="space-y-4">
            {filteredScholar.length > 0 ? (
              <div className="space-y-4">
                {filteredScholar.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-2xl border border-border bg-card/70 p-5 sm:p-6 transition hover:border-accent/40 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-accent/10 border border-accent/30 text-xs font-bold text-accent">
                          <Bot className="size-3.5" />
                          {item.modeName || "Academic AI Scholar"}
                        </span>
                        {item.surahNumber && item.ayahNumber && (
                          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-md border border-border">
                            Surah {item.surahNumber}:{item.ayahNumber}
                          </span>
                        )}
                        {item.rootWord && (
                          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-md border border-border">
                            Root: {item.rootWord}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePinScholar(item.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition cursor-pointer",
                            item.pinned
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={item.pinned ? "Unpin Note" : "Pin Note to Top"}
                        >
                          <Pin className={cn("size-3.5", item.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => copyToClipboard(`**Question:** ${item.question}\n\n**Answer:**\n${item.answer}`, "Scholar Q&A copied!")}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted transition cursor-pointer"
                          title="Copy Answer"
                        >
                          <Copy className="size-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveScholar(item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-muted transition cursor-pointer"
                          title="Remove Note"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Header */}
                    <div className="bg-card/80 p-3.5 rounded-xl border border-border">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Inquiry</span>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">{item.question}</p>
                    </div>

                    {/* Synthesized Response */}
                    <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-reading">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.answer}
                      </ReactMarkdown>
                    </div>

                    {/* Sources snippet if any */}
                    {item.sources && item.sources.length > 0 && (
                      <div className="pt-3 border-t border-border/50 flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Citations & References</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.sources.map((src, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-card border border-border text-muted-foreground">
                              {src.book} {src.authorName && `(${src.authorName})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/40 border border-border rounded-3xl space-y-4">
                <Sparkles className="size-10 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-reading">No saved scholar answers yet.</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When asking questions in the AI Scholar sidebar or assistant, click the bookmark icon to save full research answers here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Reading History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Reading Sessions ({readingHistory.length})
              </span>
              {readingHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-red-400/80 hover:text-red-400 transition"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>

            {readingHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readingHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-card/70 border border-border flex items-center justify-between gap-3 hover:border-accent/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                        {item.surahId}:{item.ayahNumber}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{item.surahName}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-2.5" /> {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/tafsir?surah=${item.surahId}&ayah=${item.ayahNumber}`}
                      className="p-2 rounded-xl bg-muted hover:bg-accent hover:text-accent-foreground text-reading transition shrink-0"
                      title="Jump to reading"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card/40 border border-border rounded-3xl space-y-4">
                <History className="size-10 text-muted-foreground mx-auto" />
                <p className="text-base font-semibold text-reading">No reading history yet.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
