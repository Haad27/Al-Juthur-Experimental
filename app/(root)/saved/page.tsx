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
  ArrowLeft,
  Search,
  BookOpenText,
  Clock,
  Trash2,
  PenLine,
  LayoutGrid,
  List
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

type TabType = "highlights" | "notes" | "tafsirs" | "ayahs" | "scholar" | "history";
type SortOption = "pinned" | "surah" | "ayah" | "recent";
type ViewMode = "grid" | "list";
type HighlightFilter = "all" | "yellow" | "blue" | "pink" | "green";

const getHighlightStyle = (color?: string) => {
  switch (color?.toLowerCase()) {
    case "yellow": return "border-l-yellow-400 bg-yellow-400/5";
    case "blue": return "border-l-blue-400 bg-blue-400/5";
    case "pink": return "border-l-pink-400 bg-pink-400/5";
    case "green": return "border-l-emerald-400 bg-emerald-400/5";
    default: return "border-l-accent bg-accent/5";
  }
};

const getHighlightDot = (color?: string) => {
  switch (color?.toLowerCase()) {
    case "yellow": return "bg-yellow-400";
    case "blue": return "bg-blue-400";
    case "pink": return "bg-pink-400";
    case "green": return "bg-emerald-400";
    default: return "bg-accent";
  }
};

export default function SavedPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("highlights");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("pinned");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>("all");

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
    try {
      const savedMode = localStorage.getItem("aljuthur-library-view-mode") as ViewMode;
      if (savedMode === "list" || savedMode === "grid") {
        setViewMode(savedMode);
      }
    } catch {
      // fallback to grid
    }

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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("aljuthur-library-view-mode", mode);
    } catch {}
  };

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

  // Filtered & Sorted Data
  const filteredHighlights = useMemo(() => {
    let list = [...savedHighlights];
    if (highlightFilter !== "all") {
      list = list.filter(h => h.color?.toLowerCase() === highlightFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => h.text.toLowerCase().includes(q) || h.authorName?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [savedHighlights, searchQuery, highlightFilter]);

  const filteredNotes = useMemo(() => {
    let list = [...savedNotes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.text.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [savedNotes, searchQuery]);

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
          t.tafsirSnippet.toLowerCase().includes(q.toLowerCase())
      );
    }
    if (sortBy === "pinned") return [...list.filter(t => t.pinned), ...list.filter(t => !t.pinned)];
    if (sortBy === "surah") return list.sort((a, b) => a.surahId - b.surahId);
    if (sortBy === "ayah") return list.sort((a, b) => a.ayahNumber - b.ayahNumber);
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [savedTafsirs, searchQuery, sortBy]);

  const filteredAyahs = useMemo(() => {
    let list = [...savedAyahs];
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      const parsedRef = parseSurahVerseReference(q);
      list = list.filter(
        (a) =>
          (parsedRef?.surahNumber && a.surahNumber === parsedRef.surahNumber && (!parsedRef.ayahNumber || a.numberInSurah === parsedRef.ayahNumber)) ||
          isFuzzyMatch(q, a.text) ||
          isFuzzyMatch(q, a.translation)
      );
    }
    if (sortBy === "pinned") return [...list.filter(a => a.pinned), ...list.filter(a => !a.pinned)];
    if (sortBy === "surah") return list.sort((a, b) => a.surahNumber - b.surahNumber);
    if (sortBy === "ayah") return list.sort((a, b) => a.numberInSurah - b.numberInSurah);
    return list.reverse();
  }, [savedAyahs, searchQuery, sortBy]);

  const filteredScholar = useMemo(() => {
    let list = [...savedScholarAnswers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s => s.question.toLowerCase().includes(q) || s.answer.toLowerCase().includes(q)
      );
    }
    return [...list.filter(s => s.pinned), ...list.filter(s => !s.pinned)];
  }, [savedScholarAnswers, searchQuery]);

  const timeAgo = (timestamp: number | string) => {
    const time = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    const diff = Date.now() - time;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(time).toLocaleDateString();
  };

  return (
    <main className="min-h-screen w-full bg-[#FCFAF6] dark:bg-background text-foreground pb-28">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header & Hero Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Saved</h1>
              <p className="text-sm text-muted-foreground mt-1">Your bookmarks, highlights, and notes</p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-card/80 border border-border/80 rounded-2xl p-1 shadow-sm">
              <button 
                onClick={() => handleViewModeChange("list")}
                title="List View"
                className={cn(
                  "p-2 rounded-xl transition cursor-pointer flex items-center justify-center",
                  viewMode === "list"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-4" />
              </button>
              <button 
                onClick={() => handleViewModeChange("grid")}
                title="Grid View"
                className={cn(
                  "p-2 rounded-xl transition cursor-pointer flex items-center justify-center",
                  viewMode === "grid"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>

          {/* Continue Reading Hero (only if valid last read) */}
          {lastRead && (
            <div className="relative overflow-hidden rounded-3xl bg-accent text-accent-foreground shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <BookOpen className="size-40" />
              </div>
              <div className="relative z-10 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/80 flex items-center gap-2">
                  <Clock className="size-3.5" /> Continue Reading
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold">{lastRead.surahName}</h2>
                <p className="text-sm text-accent-foreground/90">
                  Ayah {lastRead.ayahNumber} • {lastRead.authorName}
                </p>
              </div>
              <Link
                href={`/tafsir?author=${lastRead.authorId}&surah=${lastRead.surahId}&ayah=${lastRead.ayahNumber}`}
                className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-background text-foreground font-semibold px-6 py-3 rounded-full text-sm shadow-md hover:scale-105 transition-transform"
              >
                Resume Study <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Global Navigation Pills */}
        <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 pb-2">
          {[
            { id: "highlights", label: "Highlights", icon: Sparkles, count: savedHighlights.length },
            { id: "notes", label: "Notes", icon: PenLine, count: savedNotes.length },
            { id: "tafsirs", label: "Tafsirs", icon: BookOpenText, count: savedTafsirs.length },
            { id: "ayahs", label: "Ayahs", icon: BookOpen, count: savedAyahs.length },
            { id: "scholar", label: "Q&A", icon: Bot, count: savedScholarAnswers.length },
            { id: "history", label: "History", icon: History, count: readingHistory.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 border",
                activeTab === tab.id 
                  ? "bg-accent border-accent text-accent-foreground shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              <tab.icon className="size-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-1",
                  activeTab === tab.id ? "bg-background/20" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Sub-filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border/60 rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-sm"
            />
          </div>

          {activeTab === "highlights" && (
            <div className="flex overflow-x-auto hide-scrollbar w-full sm:w-auto gap-2">
              {(["all", "yellow", "blue", "pink", "green"] as HighlightFilter[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setHighlightFilter(c)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0",
                    highlightFilter === c ? "bg-card border-border shadow-sm text-foreground" : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c !== "all" && <div className={cn("size-2.5 rounded-full", getHighlightDot(c))} />}
                  <span className="capitalize">{c}</span>
                </button>
              ))}
            </div>
          )}
          
          {(activeTab === "tafsirs" || activeTab === "ayahs") && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-card/60 border border-border/60 rounded-full px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition cursor-pointer shadow-sm ml-auto"
            >
              <option value="pinned">Pinned First</option>
              <option value="recent">Most Recent</option>
              <option value="surah">By Surah</option>
              <option value="ayah">By Ayah</option>
            </select>
          )}
        </div>

        {/* Content Area */}
        <div className="pt-2">
          
          {/* Highlights Tab */}
          {activeTab === "highlights" && (
            filteredHighlights.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {filteredHighlights.map((hl) => (
                  <div key={hl.id} className="group flex flex-col bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <Link href={`/surah/${hl.surahId}?ayah=${hl.ayahNumber}`} className="flex items-center gap-2 bg-accent/10 text-accent px-2.5 py-1 rounded-md text-xs font-medium hover:bg-accent/20 transition">
                        <Bookmark className="size-3.5 fill-accent/20" />
                        Surah {hl.surahId} : {hl.ayahNumber}
                      </Link>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { copyToClipboard(hl.text, "Copied"); }} className="p-1.5 text-muted-foreground hover:text-foreground">
                          <Copy className="size-3.5" />
                        </button>
                        <button onClick={async () => {
                          if (await deleteUserHighlight(hl.id)) {
                            setSavedHighlights(savedHighlights.filter(h => h.id !== hl.id));
                            toast.info("Highlight deleted");
                          }
                        }} className="p-1.5 text-muted-foreground hover:text-red-500">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <blockquote className={cn("pl-4 py-1.5 mb-4 text-base border-l-[3px]", getHighlightStyle(hl.color))}>
                      <span className={cn("leading-relaxed", hl.type === "arabic" ? "font-mushaf-indopak-16 text-xl text-right block" : "text-reading italic")}>
                        {hl.text}
                      </span>
                    </blockquote>
                    
                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {hl.authorName && <span className="font-medium text-foreground/80">{hl.authorName}</span>}
                        {hl.authorName && <span>•</span>}
                        <span className="uppercase tracking-wider">{hl.type}</span>
                      </div>
                      <span>{timeAgo(hl.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No Highlights Yet" subtitle="Select text while reading to highlight it and find it here." link="/surah/1" linkText="Start Reading" />
            )
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            filteredNotes.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {filteredNotes.map((note) => (
                  <div key={note.id} className="group relative bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button onClick={async () => {
                        if (await deleteUserNote(note.id)) {
                          setSavedNotes(savedNotes.filter(n => n.id !== note.id));
                          toast.info("Note deleted");
                        }
                      }} className="p-1.5 text-muted-foreground hover:text-red-500 bg-background/50 rounded-lg backdrop-blur-sm">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed flex-1 mb-4">
                      {note.text}
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
                      <Link href={`/surah/${note.surahId}?ayah=${note.ayahNumber}`} className="flex items-center gap-2 text-xs font-medium text-accent hover:underline">
                        <Bookmark className="size-3.5" />
                        Surah {note.surahId} : {note.ayahNumber}
                      </Link>
                      <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={PenLine} title="No Notes Yet" subtitle="Long press on any ayah or click the note icon to add your personal reflections." link="/tafsir" linkText="Read Tafsir" />
            )
          )}

          {/* Tafsirs Tab */}
          {activeTab === "tafsirs" && (
            filteredTafsirs.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {filteredTafsirs.map((t) => (
                  <div key={t.id} className="group flex flex-col sm:flex-row gap-4 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link href={`/tafsir?author=${t.authorId}&surah=${t.surahId}&ayah=${t.ayahNumber}`} className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition">
                          Surah {t.surahId}:{t.ayahNumber}
                        </Link>
                        <span className="text-sm font-medium text-foreground">{t.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}</span>
                        {t.pinned && <Pin className="size-3 text-accent ml-auto" />}
                      </div>
                      <div className="text-sm text-reading line-clamp-3 opacity-90 border-l-2 border-accent/30 pl-3 py-1 my-2">
                        {t.tafsirSnippet}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                        {t.langName && <span>{t.langName}</span>}
                        <span>•</span>
                        <span>{timeAgo(t.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center justify-end sm:justify-start gap-2 border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-3">
                      <Link href={`/tafsir?author=${t.authorId}&surah=${t.surahId}&ayah=${t.ayahNumber}`} className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl transition" title="Read Full">
                        <BookOpenText className="size-4" />
                      </Link>
                      <button onClick={() => copyToClipboard(t.fullTafsirText || t.tafsirSnippet, "Tafsir copied!")} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition">
                        <Copy className="size-4" />
                      </button>
                      <button onClick={() => handleTogglePinTafsir(t.id)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition">
                        <Pin className="size-4" />
                      </button>
                      <button onClick={() => handleRemoveTafsir(t.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={BookOpenText} title="No Saved Tafsirs" subtitle="Bookmark commentaries while reading Tafsir to save them here." link="/tafsir" linkText="Browse Tafsir" />
            )
          )}

          {/* Ayahs Tab */}
          {activeTab === "ayahs" && (
            filteredAyahs.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {filteredAyahs.map((ayah) => (
                  <div key={ayah.number} className="group bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <Link href={`/surah/${ayah.surahNumber}?ayah=${ayah.numberInSurah}`} className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-accent/20 transition">
                        Surah {ayah.surahNumber} : {ayah.numberInSurah}
                      </Link>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => togglePinAyah(ayah.number)} className={cn("p-1.5 rounded-lg transition", ayah.pinned ? "text-accent" : "text-muted-foreground hover:text-foreground")}>
                          <Pin className="size-4" />
                        </button>
                        <button onClick={() => handleRemoveAyah(ayah.number)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg transition">
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-mushaf-indopak-16 text-arabic text-right mb-4 leading-loose" dir="rtl">
                      {ayah.text}
                    </div>
                    <div className="text-sm text-reading text-foreground/90 pb-2">
                      {ayah.translation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="No Saved Ayahs" subtitle="Bookmark any Quranic verse to quickly find and study it later." link="/surah/1" linkText="Read Quran" />
            )
          )}

          {/* AI Scholar Tab */}
          {activeTab === "scholar" && (
            filteredScholar.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {filteredScholar.map((item) => (
                  <div key={item.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="bg-accent/10 p-1.5 rounded-lg">
                          <Bot className="size-4 text-accent" />
                        </div>
                        <span className="text-xs font-semibold text-accent uppercase tracking-wider">{item.modeName || "Research Q&A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleTogglePinScholar(item.id)} className={cn("p-1.5 rounded-lg transition", item.pinned ? "text-accent" : "text-muted-foreground hover:text-foreground")}>
                          <Pin className="size-4" />
                        </button>
                        <button onClick={() => handleRemoveScholar(item.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg transition">
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="font-serif font-semibold text-lg text-foreground mb-2">
                      {item.question}
                    </div>
                    <div className="text-sm text-reading prose dark:prose-invert max-w-none opacity-90 line-clamp-4 hover:line-clamp-none transition-all duration-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Bot} title="No Scholar Answers" subtitle="Save important answers from the AI Scholar assistant to build your knowledge base." link="/rag" linkText="Ask Scholar" />
            )
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {readingHistory.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={handleClearHistory} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 bg-red-500/10 px-3 py-1.5 rounded-lg transition font-medium">
                    <Trash2 className="size-3.5" /> Clear History
                  </button>
                </div>
              )}
              {readingHistory.length > 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                  {readingHistory.map((item, idx) => (
                    <Link key={idx} href={`/tafsir?surah=${item.surahId}&ayah=${item.ayahNumber}`} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-muted/50 transition group">
                      <div className="flex items-center gap-4">
                        <div className="bg-background border border-border size-10 rounded-full flex items-center justify-center shrink-0 group-hover:border-accent/50 group-hover:text-accent transition">
                          <Clock className="size-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">Surah {item.surahName} • Ayah {item.ayahNumber}</div>
                          <div className="text-xs text-muted-foreground">{item.authorName.replace(/\s*\([^)]*\)\s*$/, '').trim()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground hidden sm:block">{timeAgo(item.timestamp)}</span>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={History} title="No Reading History" subtitle="Your recently viewed verses and tafsirs will appear here." link="/home" linkText="Go Home" />
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

function EmptyState({ icon: Icon, title, subtitle, link, linkText }: { icon: any, title: string, subtitle: string, link: string, linkText: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 bg-card/30 border border-border/50 rounded-3xl mt-4">
      <div className="size-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-5 text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h2 className="text-xl font-serif font-semibold text-foreground mb-2 text-center">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm text-center mb-8 leading-relaxed">
        {subtitle}
      </p>
      <Link href={link} className="inline-flex items-center gap-2 bg-foreground text-background font-medium px-5 py-2.5 rounded-full text-sm transition-all hover:opacity-90 shadow-sm">
        {linkText}
      </Link>
    </div>
  );
}
