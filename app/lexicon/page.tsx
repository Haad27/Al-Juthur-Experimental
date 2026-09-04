'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoIcon from '@/components/svg/icons/LogoIcon';
import {
  Search,
  BookOpen,
  Sparkles,
  Layers,
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Copy,
  BookOpenText,
  X,
  ChevronDown,
  Languages,
  Bot,
  AlertTriangle,
  Bookmark,
  Lock,
} from 'lucide-react';
import InlineTranslation from '@/components/shared/InlineTranslation';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import { copyToClipboard } from '@/lib/utils';
import LexiconTextRenderer from '@/components/lexicon/LexiconTextRenderer';
import { amiriquran, inter } from '@/app/fonts';
import AppHeader from '@/components/layout/AppHeader';
import AyahChatSidebar from '@/components/ai/AyahChatSidebar';
import FloatingAskScholarButton from '@/components/ai/FloatingAskScholarButton';
import { useSubscriptionStore } from '@/lib/stores/subscriptionStore';

interface DictionaryInfo {
  id: number;
  ident: string;
  name: string;
  info: string;
  is_hi_capable: boolean;
  ar_en: boolean;
  link: string;
}

interface PdfDictionaryInfo {
  id: string;
  name: string;
  author: string;
  language: 'English' | 'Urdu';
  filePath: string;
  sizeMb: string;
  description: string;
}

interface StructuredLaneEntry {
  id: number;
  root: string;
  root_buckwalter: string;
  definition_en: string | null;
  summary_en: string | null;
  summary_tr: string | null;
  quran_frequency: number;
  morphological_forms: Array<{
    form_pattern: string;
    form_arabic: string;
    form_name: string;
    form_category: string;
    example_word: string;
    occurrences: number;
  }>;
}

interface LexiconEntry {
  dictId: number;
  dictName: string;
  dictIdent: string;
  isEnglish: boolean;
  definitions: string[];
  isModern?: boolean;
}

interface RootLexiconResult {
  root: string;
  normalizedRoot: string;
  structuredLane: StructuredLaneEntry | null;
  entries: LexiconEntry[];
  ai_summary?: {
    root_meaning_html: string;
    quranic_usage_html: string;
  } | null;
}

const POPULAR_ROOTS = [
  { root: 'رحم', meaning: 'Mercy / Womb' },
  { root: 'علم', meaning: 'Knowledge / Knowing' },
  { root: 'كتب', meaning: 'Writing / Book' },
  { root: 'نور', meaning: 'Light / Illumination' },
  { root: 'سلم', meaning: 'Peace / Submission' },
  { root: 'أله', meaning: 'Divinity / God' },
  { root: 'قلب', meaning: 'Heart / Turning' },
  { root: 'هدي', meaning: 'Guidance / Leading' },
];
const formatArabicWithIndoPak = (html: string) => {
  if (!html) return '';
  return html.replace(
    /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
    '<span class="font-mushaf-indopak-16 text-sm sm:text-base leading-normal text-emerald-200 inline-block mx-1" dir="rtl">$&</span>'
  );
};

function LexiconPageContent() {
  const { tier, openPricingModal } = useSubscriptionStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoot = searchParams.get('root') || 'رحم';
  const urlAuthor = searchParams.get('author');

  const [searchQuery, setSearchQuery] = useState(initialRoot);
  const [activeRoot, setActiveRoot] = useState(initialRoot);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RootLexiconResult | null>(null);
  
  const [aiChatContext, setAiChatContext] = useState<{ root: string } | null>(null);
  const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
  const [pdfDictionaries, setPdfDictionaries] = useState<PdfDictionaryInfo[]>([]);
  const [selectedDictId, setSelectedDictId] = useState<number | 'all'>('all');
  const [isAiSummaryExpanded, setIsAiSummaryExpanded] = useState(false);

  // Scroll navigation state
  const [readingProgress, setReadingProgress] = useState(0);
  const [topNavVisible, setTopNavVisible] = useState(true);
  const lastScrollYRef = useRef<number>(0);

  const [isLexiconSearchFocused, setIsLexiconSearchFocused] = useState(false);
  const lexiconSearchContainerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lexiconSearchContainerRef.current && !lexiconSearchContainerRef.current.contains(event.target as Node)) {
        setIsLexiconSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const rootParam = searchParams.get('root');
    if (rootParam && rootParam !== activeRoot) {
      setActiveRoot(rootParam);
      setSearchQuery(rootParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/lexicon/dictionaries')
      .then((r) => r.json())
      .then((data) => {
        if (data.dictionaries) setDictionaries(data.dictionaries);
        if (data.pdfDictionaries) setPdfDictionaries(data.pdfDictionaries);
      })
      .catch((e) => console.error('Failed to load dictionaries', e));
  }, []);

  useEffect(() => {
    if (activeRoot) {
      loadRootLexicon(activeRoot);
    }
  }, [activeRoot]);

  // Scroll listener for reading progress
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setReadingProgress(pct);

      // Hide top nav when scrolling down, show when scrolling up
      if (scrollTop > lastScrollYRef.current && scrollTop > 50) {
        setTopNavVisible(false);
      } else if (scrollTop < lastScrollYRef.current) {
        setTopNavVisible(true);
      }
      lastScrollYRef.current = scrollTop;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
  }, []);

  const loadRootLexicon = async (root: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lexicon/root/${encodeURIComponent(root)}`);
      const data = await res.json();
      setResult(data);
      
      // Deep link to specific dictionary
      if (urlAuthor && data.entries) {
        const query = urlAuthor.toLowerCase().replace(/[''`'"\-–—:;,.()\[\]\/]/g, " ").replace(/\s+/g, " ").trim();
        const matched = data.entries.find((e: LexiconEntry) => 
          e.dictName.toLowerCase().replace(/[''`'"\-–—:;,.()\[\]\/]/g, " ").replace(/\s+/g, " ").trim().includes(query) ||
          e.dictIdent.toLowerCase().includes(query)
        );
        if (matched) {
          setSelectedDictId(matched.dictId);
        } else {
          setSelectedDictId('all');
        }
      } else {
        setSelectedDictId('all');
      }
    } catch (err) {
      console.error('Error fetching root lexicon:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveRoot(searchQuery.trim());
    }
  };

  const handleCopyDefinition = (text: string, dictName: string) => {
    const clean = text.replace(/<[^>]*>?/gm, '');
    copyToClipboard(`[${result?.normalizedRoot || activeRoot} - ${dictName}]\n${clean}`, "Definition copied to clipboard!");
  };

  const filteredEntries =
    result?.entries?.filter((entry) => {
      if (selectedDictId !== 'all' && entry.dictId !== selectedDictId) return false;
      return true;
    }) || [];

  // ==========================================
  // STANDARD LEXICON MODE (PINNED GLOSSY TOP BAR + 3-COLUMN DESKTOP)
  // ==========================================
  return (
    <div className={`min-h-screen bg-background text-foreground pb-36 md:pb-24 ${inter.className} transition-all duration-300 ${!!aiChatContext ? 'lg:pr-[420px] xl:pr-[450px]' : ''}`}>
      <AppHeader
        subtitle={
          (activeRoot || result?.normalizedRoot) ? (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs">
              <span className="uppercase tracking-wider text-muted-foreground">Root</span>
              <span className="font-arabic font-semibold text-arabic">{result?.normalizedRoot || activeRoot}</span>
            </span>
          ) : undefined
        }
      />

          {/* MOBILE ONLY: Pinned Dropdowns for Dictionaries & PDF Lexicons */}
          {result?.entries && result.entries.length > 0 && (
            <div className="md:hidden flex gap-2 w-full px-4 pt-3">
              {/* Dictionary Dropdown (Prominent Green Border) */}
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedDictId}
                  onChange={(e) => setSelectedDictId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring pr-7 truncate"
                >
                  <option value="all" className="bg-zinc-900 text-white">All Dictionaries ({result.entries.length})</option>
                  {result.entries.map((entry) => (
                    <option key={entry.dictId} value={entry.dictId} className="bg-zinc-900 text-white">
                      {entry.dictName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
              </div>

              {/* PDF Lexicons Dropdown */}
              {pdfDictionaries.length > 0 && (
                <div className="relative flex-1 min-w-0">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        window.location.href = `/api/lexicon/pdf?file=${encodeURIComponent(e.target.value)}`;
                      }
                    }}
                    className="w-full appearance-none bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-emerald-500/50 pr-7 shadow-sm truncate"
                  >
                    <option value="" className="bg-zinc-900 text-white">PDF Lexicons ({pdfDictionaries.length})</option>
                    {pdfDictionaries.map((pdf) => (
                      <option key={pdf.id} value={pdf.filePath} className="bg-zinc-900 text-white">
                        {pdf.name} ({pdf.language})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
                </div>
              )}
            </div>
          )}

      {/* Search Bar & Container */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div className="max-w-3xl mx-auto mb-6">
          {/* Subtle Compact Hero Header */}
          <div className="text-center space-y-1.5 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <Sparkles className="size-3 text-emerald-400" />
              <span>Classical Lexical Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Classical Arabic Root Lexicon
            </h1>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-[1.7]">
              Explore Lane&apos;s Lexicon, Lisan al-Arab, and classical etymological dictionaries by Arabic root.
            </p>
          </div>

          <form ref={lexiconSearchContainerRef} onSubmit={handleSearchSubmit} className="relative mb-3">
            <div className="relative flex items-center z-20">
              <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsLexiconSearchFocused(true)}
                placeholder="Search Arabic root (e.g. رحم, كتب, نور)..."
                className="w-full pl-12 pr-28 py-2.5 md:py-3 bg-card border border-border rounded-xl text-sm md:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                dir="auto"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 md:px-5 py-1.5 bg-primary text-primary-foreground font-medium text-xs md:text-sm rounded-lg transition-opacity hover:opacity-90 flex items-center gap-1.5"
              >
                Explore
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {isLexiconSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                {POPULAR_ROOTS.filter(r => r.root.includes(searchQuery.trim()) || r.meaning.toLowerCase().includes(searchQuery.trim().toLowerCase())).length > 0 ? (
                  <div className="p-1.5 flex flex-col gap-1">
                    {POPULAR_ROOTS.filter(r => r.root.includes(searchQuery.trim()) || r.meaning.toLowerCase().includes(searchQuery.trim().toLowerCase())).map((item) => (
                      <button
                        key={`suggest-root-${item.root}`}
                        onClick={() => {
                          setSearchQuery(item.root);
                          setActiveRoot(item.root);
                          setIsLexiconSearchFocused(false);
                        }}
                        type="button"
                        className="flex items-center justify-between text-left px-3 py-2 hover:bg-emerald-500/10 rounded-lg transition-colors w-full"
                      >
                        <span className="font-arabic font-bold text-base text-zinc-200">{item.root}</span>
                        <span className="text-xs text-zinc-500">{item.meaning}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-zinc-500 text-center">Press Explore to search dictionary</div>
                )}
              </div>
            )}
          </form>

          {/* Popular Roots (Single Horizontal Row on Mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">Roots:</span>
            {POPULAR_ROOTS.map((item) => (
              <button
                key={item.root}
                onClick={() => {
                  setSearchQuery(item.root);
                  setActiveRoot(item.root);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                  activeRoot === item.root
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <span className="font-arabic font-bold text-sm">{item.root}</span>
                <span className="text-[10px] text-zinc-400">({item.meaning})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
            <p className="text-zinc-400 text-sm">Searching classical dictionaries for root [{activeRoot}]...</p>
          </div>
        )}

        {/* 
          3-COLUMN STANDARD LEXICON LAYOUT
        */}
        {!loading && result && result.entries && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 
              LEFT COLUMN (Desktop Only - lg:col-span-3): Dictionaries Selector Sidebar
            */}
            <div className="hidden lg:block lg:col-span-3 space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 shadow-xl sticky top-[73px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                    <BookOpen className="size-4 text-emerald-400" />
                    Dictionaries ({result.entries.length})
                  </h3>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-1 custom-scrollbar">
                  <button
                    onClick={() => setSelectedDictId('all')}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedDictId === 'all'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">All Dictionaries</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Combined View</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {result.entries.length}
                    </span>
                  </button>

                  {result.entries.map((entry) => (
                    <button
                      key={entry.dictId}
                      onClick={() => setSelectedDictId(entry.dictId)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        selectedDictId === entry.dictId
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">{entry.dictName}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                          {entry.definitions.length} {entry.definitions.length === 1 ? 'definition' : 'definitions'}
                        </div>
                      </div>
                      {entry.isEnglish && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 shrink-0">
                          EN
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 
              MIDDLE COLUMN (lg:col-span-6): Micro-Compact Root Banner & Main Definitions 
            */}
            <div className="lg:col-span-6 space-y-4 md:space-y-6">
              {/* Micro-Compact Active Root Banner */}
              <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-xl px-4 py-2 md:px-5 md:py-3 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                    Root
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-arabic text-white truncate">
                    {result.normalizedRoot}
                  </h2>
                </div>

                {result.structuredLane && (
                  <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-zinc-400">Freq:</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {result.structuredLane.quran_frequency}x
                      </span>
                    </div>
                    {result.structuredLane.morphological_forms.length > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <Layers className="size-3 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-emerald-300 font-medium">
                          {result.structuredLane.morphological_forms.length} derivations
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Compact Quranic Derivations Chips (Single Horizontal Scroll Row) */}
              {result.structuredLane && result.structuredLane.morphological_forms.length > 0 && (
                <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-zinc-800/40 pt-2">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 mr-0.5">
                    Derivations:
                  </span>
                  {result.structuredLane.morphological_forms.map((form, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] shrink-0 whitespace-nowrap"
                    >
                      <span className="font-arabic font-bold text-emerald-300">{form.example_word}</span>
                      <span className="text-zinc-400">{form.form_name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{form.occurrences}x</span>
                    </span>
                  ))}
                </div>
              )}

              {/* AI Comprehensive Root Summary (Always Open & Styled like Root Word Analysis) */}
              {result.ai_summary && (
                <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-zinc-800/80 pb-3">
                    <div className="p-1.5 bg-emerald-500/20 rounded-md border border-emerald-500/30 text-emerald-400">
                      <Sparkles className="size-4" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-emerald-300 tracking-tight">Comprehensive Root Summary</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <strong className="text-emerald-400 font-semibold block mb-1 text-xs sm:text-sm">
                        Root Meaning:
                      </strong>
                      <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-slate-200 prose-em:text-slate-400 text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: formatArabicWithIndoPak(result.ai_summary.root_meaning_html) }} />
                    </div>
                    
                    <div className="border-t border-zinc-800/80 pt-3">
                      <strong className="text-amber-400 font-semibold block mb-1 text-xs sm:text-sm">
                        Quranic Usage:
                      </strong>
                      <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-slate-200 prose-em:text-slate-400 text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: formatArabicWithIndoPak(result.ai_summary.quranic_usage_html) }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Lexicon Definitions Display (Starts immediately below header) */}
              <div className="space-y-4 md:space-y-6">
                {filteredEntries.map((entry) => {
                  // const isFreeDict = (entry.dictIdent || "").toLowerCase().includes("mufradat") || (entry.dictName || "").toLowerCase().includes("mufradat");
                  // const isLocked = tier === "FREE" && !isFreeDict;
                  const isLocked = false; // Full free mode for now

                  return (
                    <div
                      key={entry.dictId}
                      className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-emerald-500/20 rounded-2xl p-4 md:p-6 shadow-lg space-y-4 hover:border-emerald-500/35 transition-all"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-bold text-emerald-300/90 border-l-2 border-emerald-500/60 pl-2.5">
                            {entry.dictName}
                          </h3>
                          {/* {isLocked && (
                            <span className="text-[9px] md:text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Lock className="size-2.5" />
                              <span>PRO</span>
                            </span>
                          )} */}
                          {entry.isEnglish && (
                            <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              English
                            </span>
                          )}
                          {entry.isModern && (
                            <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Modern (MSA)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyDefinition(entry.definitions.join('\n'), entry.dictName)}
                            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition text-xs font-medium text-zinc-300 cursor-pointer"
                            title="Copy Definition"
                          >
                            <Copy className="size-3.5 shrink-0" />
                            <span className="hidden sm:inline">Copy</span>
                          </button>
                        </div>
                      </div>

                      {entry.isModern && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-3 text-xs md:text-sm text-amber-200/90 leading-relaxed mb-4">
                          <AlertTriangle className="size-4 md:size-5 shrink-0 text-amber-400 mt-0.5" />
                          <p>
                            <strong>Important Note:</strong> This is a modern lexicon (Modern Standard Arabic). It is provided here only for learning purposes and recognizing basic verb forms. <strong>Do not use it</strong> for determining the root meaning of classical Quranic words, as modern usage often differs entirely from 7th-century usage.
                          </p>
                        </div>
                      )}

                      <div className="space-y-5">
                        {(isLocked ? entry.definitions.slice(0, 1) : entry.definitions).map((def, dIdx) => (
                          <div key={dIdx} className="space-y-2">
                            <LexiconTextRenderer 
                              text={def} 
                              isLocked={isLocked}
                              dictName={entry.dictName}
                              onUpgradeClick={openPricingModal}
                            />
                          </div>
                        ))}
                      </div>
                      {!entry.isEnglish && !isLocked && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/40 w-full">
                          <InlineTranslation 
                            textToTranslate={entry.definitions.join('\n').replace(/<[^>]*>?/gm, '')} 
                            storageKey={`lexicon_${entry.dictId}_${result?.root || searchQuery}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 
              RIGHT COLUMN (Desktop Only - lg:col-span-3): Quranic Forms & PDF Reference Lexicons 
            */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              {/* Quranic Morphological Derivations (Non-sticky) */}
              {result.structuredLane && result.structuredLane.morphological_forms.length > 0 && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2 mb-3">
                    <Layers className="size-4 text-emerald-400" />
                    Quranic Derivations ({result.structuredLane.morphological_forms.length})
                  </h3>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {result.structuredLane.morphological_forms.map((form, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{form.form_name}</div>
                          <div className="text-[10px] text-zinc-400 capitalize">
                            {form.form_category} • {form.form_pattern}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-arabic font-bold text-emerald-300">
                            {form.example_word}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {form.occurrences} {form.occurrences === 1 ? 'verse' : 'verses'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Reference Lexicons (Sticky & Scrollable) */}
              {pdfDictionaries.length > 0 && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl sticky top-[73px] max-h-[calc(100vh-140px)] flex flex-col mb-16">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                      <FileText className="size-4 text-emerald-400" />
                      PDF Lexicons ({pdfDictionaries.length})
                    </h3>
                  </div>
                  <div className="space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                    {pdfDictionaries.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-white">{pdf.name}</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">{pdf.author}</p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              pdf.language === 'English'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {pdf.language}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono">{pdf.sizeMb}</span>
                          <a
                            href={`/api/lexicon/pdf?file=${encodeURIComponent(pdf.filePath)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-medium transition"
                          >
                            <span>Open PDF</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        <AyahChatSidebar
          surahNumber={0}
          ayahNumber={0}
          isOpen={!!aiChatContext}
          onClose={() => setAiChatContext(null)}
          initialModeId="lexicon"
          rootWord={aiChatContext?.root}
        />

        <FloatingAskScholarButton
          onClick={() => setAiChatContext({ root: activeRoot })}
          label="Ask Lexicon Scholar"
          isVisible={!aiChatContext && !!result}
        />
      </div>
    </div>
  );
}

export default function LexiconPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
          <p className="text-zinc-400 text-sm">Loading Lexicon...</p>
        </div>
      }
    >
      <LexiconPageContent />
    </Suspense>
  );
}
