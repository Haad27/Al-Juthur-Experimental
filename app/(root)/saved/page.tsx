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
    <main className="min-h-screen w-full bg-[#0a0a0c] text-white px-4 sm:px-6 lg:px-8 py-8 pb-28">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Link
              href="/tafsir"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 transition"
            >
              <BookOpenText className="size-4" />
              <span>Tafsir Reader</span>
            </Link>
          </div>
        </div>

        {/* Profile / Reading Progress Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900/70 to-zinc-950 p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Bookmark className="size-3" />
                Personal Quran & Tafsir Library
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Saved Knowledge & Progress
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                Continue your daily reading streak, review bookmarked exegesis, and revisit your scholarly AI inquiries.
              </p>
            </div>

            {/* Resume Last Read Card */}
            {lastRead && (
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-md sm:min-w-[260px]">
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> Last Read
                  </span>
                  <span className="text-zinc-400 lowercase font-normal">{timeAgo(lastRead.timestamp)}</span>
                </div>
                <div className="font-bold text-white text-sm sm:text-base">
                  {lastRead.surahName} : Ayah {lastRead.ayahNumber}
                </div>
                <p className="text-xs text-zinc-400 truncate">
                  {lastRead.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                </p>
                <Link
                  href={`/tafsir?author=${lastRead.authorId}&surah=${lastRead.surahId}&ayah=${lastRead.ayahNumber}`}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm transition"
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
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <BookOpenText className="size-3.5 text-emerald-400" /> Saved Tafsirs
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white">{savedTafsirs.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-amber-400" /> Saved Ayahs
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white">{savedAyahs.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-blue-400" /> Scholar Notes
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white">{savedScholarAnswers.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <History className="size-3.5 text-purple-400" /> Recent Reads
            </span>
            <span className="text-xl sm:text-2xl font-bold text-white">{readingHistory.length}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("tafsirs")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0",
                activeTab === "tafsirs"
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
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
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
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
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
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
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search saved..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {(activeTab === "tafsirs" || activeTab === "ayahs") && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 shrink-0"
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
                    className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 transition hover:border-emerald-500/40 space-y-4 group"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-6 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {t.surahId}:{t.ayahNumber}
                        </span>
                        <span className="text-sm font-bold text-white">{t.surahName}</span>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                          <User className="size-3 text-emerald-400/80" />
                          {t.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                        </span>
                        {t.langName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase font-semibold">
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
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          )}
                          title={t.pinned ? "Unpin Tafsir" : "Pin Tafsir to Top"}
                        >
                          <Pin className={cn("size-3.5", t.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => copyToClipboard(t.fullTafsirText || t.tafsirSnippet, "Tafsir copied to clipboard!")}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Copy Tafsir"
                        >
                          <Copy className="size-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveTafsir(t.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
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
                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-h-36 overflow-hidden relative">
                      <p className="line-clamp-4">{t.tafsirSnippet}...</p>
                    </div>

                    {/* Bottom Link to Reader */}
                    <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="size-3" /> Saved {timeAgo(t.timestamp)}
                      </span>
                      <Link
                        href={`/tafsir?author=${t.authorId}&surah=${t.surahId}&ayah=${t.ayahNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 border border-zinc-700/60 text-xs font-semibold text-zinc-200 transition"
                      >
                        <span>Open in Tafsir Reader</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl space-y-4">
                <BookOpenText className="size-10 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-zinc-300">No saved Tafsir commentaries yet.</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    While exploring the Tafsir reader, click the bookmark icon on any verse to store its scholarly commentary here for daily reading.
                  </p>
                </div>
                <Link
                  href="/tafsir"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition"
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
                    className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-emerald-500/40 space-y-3 group"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                      <span className="h-6 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                        Surah {ayah.surahNumber} : Ayah {ayah.numberInSurah}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePinAyah(ayah.number)}
                          className={cn(
                            "p-1.5 rounded-lg transition cursor-pointer",
                            ayah.pinned
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          )}
                          title={ayah.pinned ? "Unpin Ayah" : "Pin Ayah"}
                        >
                          <Pin className={cn("size-3.5", ayah.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => handleRemoveAyah(ayah.number)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
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
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{ayah.translation}</p>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl space-y-4">
                <BookOpen className="size-10 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-zinc-300">No saved ayahs yet.</p>
                  <p className="text-xs text-zinc-500">Bookmark any Quranic verse to quickly study it later.</p>
                </div>
                <Link
                  href="/surah/1"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs transition"
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
                    className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6 transition hover:border-emerald-500/40 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                          <Bot className="size-3.5" />
                          {item.modeName || "Academic AI Scholar"}
                        </span>
                        {item.surahNumber && item.ayahNumber && (
                          <span className="text-xs text-zinc-400 font-semibold bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                            Surah {item.surahNumber}:{item.ayahNumber}
                          </span>
                        )}
                        {item.rootWord && (
                          <span className="text-xs text-zinc-400 font-semibold bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
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
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          )}
                          title={item.pinned ? "Unpin Note" : "Pin Note to Top"}
                        >
                          <Pin className={cn("size-3.5", item.pinned && "rotate-45")} />
                        </button>

                        <button
                          onClick={() => copyToClipboard(`**Question:** ${item.question}\n\n**Answer:**\n${item.answer}`, "Scholar Q&A copied!")}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Copy Answer"
                        >
                          <Copy className="size-3.5" />
                        </button>

                        <button
                          onClick={() => handleRemoveScholar(item.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                          title="Remove Note"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Header */}
                    <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1">Inquiry</span>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-100">{item.question}</p>
                    </div>

                    {/* Synthesized Response */}
                    <div className="prose prose-invert prose-emerald max-w-none text-xs sm:text-sm leading-relaxed text-zinc-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.answer}
                      </ReactMarkdown>
                    </div>

                    {/* Sources snippet if any */}
                    {item.sources && item.sources.length > 0 && (
                      <div className="pt-3 border-t border-zinc-800/50 flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Citations & References</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.sources.map((src, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
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
              <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl space-y-4">
                <Sparkles className="size-10 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-zinc-300">No saved scholar answers yet.</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
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
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
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
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                        {item.surahId}:{item.ayahNumber}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{item.surahName}</span>
                        <span className="text-xs text-zinc-400 truncate">
                          {item.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="size-2.5" /> {timeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/tafsir?surah=${item.surahId}&ayah=${item.ayahNumber}`}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 transition shrink-0"
                      title="Jump to reading"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl space-y-4">
                <History className="size-10 text-zinc-600 mx-auto" />
                <p className="text-base font-semibold text-zinc-300">No reading history yet.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
