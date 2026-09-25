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
import { isFuzzyMatch, parseSurahVerseReference } from "@/lib/searchUtils";
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
  ReadingHistoryItem,
  UserNote,
  UserHighlight,
  fetchUserNotes,
  fetchUserHighlights,
  deleteUserNote,
  deleteUserHighlight
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

type TabType = "tafsirs" | "ayahs" | "scholar" | "history" | "notes";
type SortOption = "pinned" | "surah" | "ayah" | "recent";

export default function SavedPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("pinned");

  // State
  const [lastRead, setLastRead] = useState<LastReadTafsir | null>(null);
  const [savedAyahs, setSavedAyahs] = useState<Ayah[]>([]);
  const [savedTafsirs, setSavedTafsirs] = useState<SavedTafsirItem[]>([]);
  const [savedScholarAnswers, setSavedScholarAnswers] = useState<SavedScholarAnswer[]>([]);
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([]);
  const [savedNotes, setSavedNotes] = useState<UserNote[]>([]);
  const [savedHighlights, setSavedHighlights] = useState<UserHighlight[]>([]);

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

    fetchUserNotes().then(setSavedNotes);
    fetchUserHighlights().then(setSavedHighlights);
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
      const q = searchQuery.trim();
      const parsedRef = parseSurahVerseReference(q);
      list = list.filter(
        (t) =>
          (parsedRef?.surahNumber && t.surahId === parsedRef.surahNumber && (!parsedRef.ayahNumber || t.ayahNumber === parsedRef.ayahNumber)) ||
          isFuzzyMatch(q, t.surahName) ||
          isFuzzyMatch(q, t.authorName) ||
          t.tafsirSnippet.toLowerCase().includes(q.toLowerCase()) ||
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
      const q = searchQuery.trim();
      const parsedRef = parseSurahVerseReference(q);
      list = list.filter(
        (a) =>
          (parsedRef?.surahNumber && a.surahNumber === parsedRef.surahNumber && (!parsedRef.ayahNumber || a.numberInSurah === parsedRef.ayahNumber)) ||
          isFuzzyMatch(q, a.text) ||
          isFuzzyMatch(q, a.translation) ||
          `surah ${a.surahNumber}`.includes(q.toLowerCase()) ||
          `${a.surahNumber}:${a.numberInSurah}`.includes(q)
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

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Your saved verses, exegesis, and scholarly inquiries.
            </p>
          </div>

          {/* Resume Last Read */}
          {lastRead && (
            <Link
              href={`/tafsir?author=${lastRead.authorId}&surah=${lastRead.surahId}&ayah=${lastRead.ayahNumber}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/50 hover:bg-card border border-border hover:border-accent/40 transition group"
            >
              <div className="flex items-center gap-2 border-r border-border/50 pr-2">
                <Clock className="size-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">Last Read</span>
              </div>
              <div className="text-xs text-muted-foreground group-hover:text-foreground transition">
                {lastRead.surahName} : Ayah {lastRead.ayahNumber}
              </div>
              <ArrowRight className="size-3 text-muted-foreground group-hover:text-accent transition ml-1" />
            </Link>
          )}
        </div>

        {/* Global Empty State */}
        {(savedAyahs.length === 0 && savedTafsirs.length === 0 && savedScholarAnswers.length === 0 && savedNotes.length === 0 && savedHighlights.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 bg-card/20 border border-border/50 rounded-3xl mt-8">
            <div className="size-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
              <BookOpenText className="size-8 text-accent opacity-80" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3 text-center">Your library is currently empty</h2>
            <p className="text-sm text-muted-foreground max-w-md text-center mb-8 leading-relaxed">
              When you highlight text, save passages, or add personal notes in the Tafsir reader, they will securely appear here for your future studies.
            </p>
            <Link
              href="/tafsir"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-6 py-3 rounded-2xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <BookOpenText className="size-4" />
              <span>Go to Tafsir Reader</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="w-full bg-card/40 rounded-full p-1 flex items-center justify-between border border-border/30">
            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer",
                activeTab === "notes"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("tafsirs")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer",
                activeTab === "tafsirs"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Saved Tafsirs
            </button>
            <button
              onClick={() => setActiveTab("ayahs")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer",
                activeTab === "ayahs"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Saved Ayahs
            </button>
            <button
              onClick={() => setActiveTab("scholar")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer",
                activeTab === "scholar"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Scholar Q&A
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer",
                activeTab === "history"
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Reading History
            </button>
          </div>

          {/* Search Bar and Sort */}
          {activeTab !== "history" && (
            <div className="flex items-center gap-4 w-full justify-end px-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-border/40 pl-6 pr-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/50 transition"
                />
              </div>

              {(activeTab === "tafsirs" || activeTab === "ayahs") && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-b border-border/40 pb-1 text-xs text-muted-foreground focus:outline-none focus:border-accent/50 focus:text-foreground transition cursor-pointer"
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
              <div className="flex flex-col">
                {filteredTafsirs.map((t) => (
                  <div
                    key={t.id}
                    className="group flex gap-4 py-3 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0"
                  >
                    {/* Left Icon */}
                    <div className="pt-0.5 shrink-0">
                      <BookOpenText className={cn("size-4 transition", t.pinned ? "text-accent" : "text-muted-foreground group-hover:text-accent/70")} />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/tafsir?author=${t.authorId}&surah=${t.surahId}&ayah=${t.ayahNumber}`} className="block">
                        <div className="text-sm font-medium text-foreground truncate">
                          {t.surahName} : Ayah {t.ayahNumber}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{t.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}</span>
                          {t.langName && <span>• {t.langName}</span>}
                          <span>• {timeAgo(t.timestamp)}</span>
                        </div>
                        <div className="text-xs text-reading line-clamp-1 mt-1 opacity-70 group-hover:opacity-100 transition">
                          {t.tafsirSnippet}
                        </div>
                      </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 gap-1">
                      <button
                        onClick={() => copyToClipboard(t.fullTafsirText || t.tafsirSnippet, "Tafsir copied to clipboard!")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Copy Tafsir"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePinTafsir(t.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title={t.pinned ? "Unpin Tafsir" : "Pin Tafsir to Top"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveTafsir(t.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition cursor-pointer"
                        title="Remove from Saved"
                      >
                        <X className="size-3.5" />
                      </button>
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
              <div className="flex flex-col">
                {filteredAyahs.map((ayah) => (
                  <div
                    key={ayah.number}
                    className="group flex gap-4 py-3 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0"
                  >
                    {/* Left Icon */}
                    <div className="pt-0.5 shrink-0">
                      <BookOpen className={cn("size-4 transition", ayah.pinned ? "text-accent" : "text-muted-foreground group-hover:text-accent/70")} />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/surah/${ayah.surahNumber}?ayah=${ayah.numberInSurah}`} className="block">
                        <div className="text-sm font-medium text-foreground truncate" dir="rtl">
                          {ayah.text}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <span>Surah {ayah.surahNumber} : Ayah {ayah.numberInSurah}</span>
                        </div>
                        <div className="text-xs text-reading line-clamp-1 mt-1 opacity-70 group-hover:opacity-100 transition">
                          {ayah.translation}
                        </div>
                      </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 gap-1">
                      <button
                        onClick={() => copyToClipboard(ayah.translation, "Translation copied to clipboard!")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Copy Translation"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => togglePinAyah(ayah.number)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title={ayah.pinned ? "Unpin Ayah" : "Pin Ayah"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveAyah(ayah.number)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition cursor-pointer"
                        title="Remove Ayah"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
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
              <div className="flex flex-col">
                {filteredScholar.map((item) => (
                  <div
                    key={item.id}
                    className="group flex gap-4 py-4 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0"
                  >
                    {/* Left Icon */}
                    <div className="pt-0.5 shrink-0">
                      <Bot className={cn("size-4 transition", item.pinned ? "text-accent" : "text-muted-foreground group-hover:text-accent/70")} />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {item.question}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <span>{item.modeName || "Academic AI Scholar"}</span>
                        {item.surahNumber && item.ayahNumber && (
                          <span>• Surah {item.surahNumber}:{item.ayahNumber}</span>
                        )}
                        {item.rootWord && (
                          <span>• Root: {item.rootWord}</span>
                        )}
                      </div>
                      <div className="text-xs text-reading line-clamp-2 mt-1.5 opacity-70 group-hover:opacity-100 transition prose dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {item.answer}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 gap-1 self-start">
                      <button
                        onClick={() => copyToClipboard(`**Question:** ${item.question}\n\n**Answer:**\n${item.answer}`, "Scholar Q&A copied!")}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Copy Answer"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePinScholar(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title={item.pinned ? "Unpin Note" : "Pin Note"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveScholar(item.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition cursor-pointer"
                        title="Remove Note"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
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
              <div className="flex flex-col">
                {readingHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center justify-between gap-4 py-3 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Left Icon */}
                      <div className="shrink-0">
                        <Clock className="size-4 text-muted-foreground group-hover:text-accent/70 transition" />
                      </div>

                      {/* Middle Content */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/tafsir?surah=${item.surahId}&ayah=${item.ayahNumber}`} className="block">
                          <div className="text-sm font-medium text-foreground truncate">
                            {item.surahName} : Ayah {item.ayahNumber}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{item.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}</span>
                            <span>• {timeAgo(item.timestamp)}</span>
                          </div>
                        </Link>
                      </div>
                    </div>

                    {/* Right Action */}
                    <Link
                      href={`/tafsir?surah=${item.surahId}&ayah=${item.ayahNumber}`}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition shrink-0"
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

      {/* Tab 5: Notes & Highlights */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            
            {/* Notes Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-accent uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <BookOpenText className="size-4" /> Personal Notes
              </h3>
              {savedNotes.length > 0 ? (
                <div className="flex flex-col">
                  {savedNotes.map((note) => (
                    <div key={note.id} className="group flex gap-4 py-4 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0">
                      {/* Left Icon */}
                      <div className="pt-0.5 shrink-0">
                        <BookOpenText className="size-4 text-muted-foreground group-hover:text-accent/70 transition" />
                      </div>

                      {/* Middle Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-reading whitespace-pre-wrap">
                          {note.text}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                          <Link href={`/surah/${note.surahId}?ayah=${note.ayahNumber}`} className="hover:text-foreground transition">
                            Surah {note.surahId} : {note.ayahNumber}
                          </Link>
                          <span>•</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 gap-1 self-start">
                        <button
                          onClick={async () => {
                            if (await deleteUserNote(note.id)) {
                              setSavedNotes(savedNotes.filter(n => n.id !== note.id));
                              toast.info("Note deleted");
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-6 px-4 bg-muted/30 rounded-xl text-center border border-border border-dashed">
                  No notes saved yet. Add notes while reading any verse.
                </div>
              )}
            </div>

            {/* Highlights Section */}
            <div className="space-y-3 pt-6">
              <h3 className="text-sm font-semibold text-accent uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <Sparkles className="size-4" /> Text Highlights
              </h3>
              {savedHighlights.length > 0 ? (
                <div className="flex flex-col">
                  {savedHighlights.map((hl) => (
                    <div key={hl.id} className="group flex gap-4 py-4 border-b border-border/30 hover:bg-card/20 transition px-2 rounded-xl last:border-0">
                      {/* Left Icon */}
                      <div className="pt-0.5 shrink-0">
                        <Sparkles className="size-4 text-muted-foreground group-hover:text-accent/70 transition" />
                      </div>

                      {/* Middle Content */}
                      <div className="flex-1 min-w-0">
                        <blockquote className={cn(
                          "pl-4 border-l-2 border-accent/50 text-sm py-1 bg-accent/5 rounded-r-lg pr-4",
                          hl.type === "arabic" ? "font-mushaf-indopak-16 text-right text-lg text-amber-100/90 leading-loose border-r-2 border-l-0 pl-4 border-accent/50" : "text-reading italic"
                        )} dir={hl.type === "arabic" ? "rtl" : "ltr"}>
                          {hl.text}
                        </blockquote>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                          <Link href={`/surah/${hl.surahId}?ayah=${hl.ayahNumber}`} className="hover:text-foreground transition">
                            Surah {hl.surahId} : {hl.ayahNumber}
                          </Link>
                          {hl.authorName && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground/80">{hl.authorName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="uppercase">{hl.type}</span>
                          <span>•</span>
                          <span>{new Date(hl.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0 gap-1 self-start">
                        <button
                          onClick={async () => {
                            if (await deleteUserHighlight(hl.id)) {
                              setSavedHighlights(savedHighlights.filter(h => h.id !== hl.id));
                              toast.info("Highlight deleted");
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition cursor-pointer"
                          title="Delete Highlight"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-6 px-4 bg-muted/30 rounded-xl text-center border border-border border-dashed">
                  No highlights saved yet. Select text while reading to highlight it.
                </div>
              )}
            </div>

          </div>
        )}
        </>
        )}

      </div>
    </main>
  );
}
