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
} from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import LexiconTextRenderer from '@/components/lexicon/LexiconTextRenderer';
import { amiriquran, inter } from '@/app/fonts';
import AyahChatSidebar from '@/components/ai/AyahChatSidebar';
import FloatingAskScholarButton from '@/components/ai/FloatingAskScholarButton';

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
}

interface RootLexiconResult {
  root: string;
  normalizedRoot: string;
  structuredLane: StructuredLaneEntry | null;
  entries: LexiconEntry[];
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

function LexiconPageContent() {
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

  // Scroll navigation state
  const [readingProgress, setReadingProgress] = useState(0);
  const [topNavVisible, setTopNavVisible] = useState(true);
  const lastScrollYRef = useRef<number>(0);

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
    navigator.clipboard.writeText(`[${result?.normalizedRoot} - ${dictName}]\n${text}`);
    toast.success('Definition copied to clipboard');
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
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-slate-100 pb-24 ${inter.className} transition-all duration-300 ${!!aiChatContext ? 'xl:pr-[450px]' : ''}`}>
      {/* Global Top Navigation Bar (Glassy Backdrop & Shadow) */}
      <div 
        className={`sticky top-0 z-40 bg-zinc-950/50 backdrop-blur-3xl border-b border-zinc-800/80 px-4 md:px-8 py-3 shadow-sm transition-transform duration-300 ${
          topNavVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
        }`}
      >
        <div className="max-w-[1700px] mx-auto relative flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Left Logo */}
            <div className="flex items-center gap-3">
              <Link href="/home" className="flex items-center gap-2">
                <LogoIcon className="w-8 h-8 rounded-[20%]" />
                <span className="font-bold text-xl tracking-tight text-white">Al-Juthur</span>
              </Link>
            </div>

            {/* Mobile Only: Current Selected Word Badge (Top Right) */}
            {(activeRoot || result?.normalizedRoot) && (
              <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 shadow-sm shrink-0">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Root:</span>
                <span className="text-sm font-bold font-arabic text-white">
                  {result?.normalizedRoot || activeRoot}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-zinc-400 text-sm font-medium">
            <Link href="/home" className="hover:text-zinc-200 transition">
              Home
            </Link>
            <Link href="/tafsir" className="hover:text-zinc-200 transition">
              Tafsir
            </Link>
            <Link href="/lexicon" className="text-white font-bold">
              Lexicon
            </Link>
            <Link href="/ai" className="hover:text-zinc-200 transition">
              AI Translator
            </Link>
            <Link href="/rag" className="hover:text-zinc-200 transition">
              RAG Bot
            </Link>
          </nav>

          {/* Desktop / Laptop Top Right: Active Root Word Badge */}
          {(activeRoot || result?.normalizedRoot) && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 shadow-sm shrink-0 ml-auto lg:ml-0">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Root:</span>
              <span className="text-sm font-bold font-arabic text-white">
                {result?.normalizedRoot || activeRoot}
              </span>
            </div>
          )}

          {/* MOBILE ONLY: Pinned Dropdowns for Dictionaries & PDF Lexicons */}
          {result?.entries && result.entries.length > 0 && (
            <div className="md:hidden flex gap-2 w-full pt-1">
              {/* Dictionary Dropdown (Prominent Green Border) */}
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedDictId}
                  onChange={(e) => setSelectedDictId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full appearance-none bg-emerald-950/30 border border-emerald-500/70 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-400 pr-7 shadow-sm truncate"
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
                        window.open(`/api/lexicon/pdf?file=${encodeURIComponent(e.target.value)}`, '_blank');
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
        </div>
      </div>

      {/* Search Bar & Container */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div className="max-w-3xl mx-auto mb-6">
          {/* Subtle Compact Hero Header */}
          <div className="text-center space-y-1.5 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <Sparkles className="size-3 text-emerald-400" />
              <span>Classical Lexical Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Classical Arabic Root Lexicon
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Explore Lane&apos;s Lexicon, Lisan al-Arab, and classical etymological dictionaries by Arabic root.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Arabic root (e.g. رحم, كتب, نور)..."
                className="w-full pl-12 pr-28 py-2.5 md:py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm md:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 shadow-lg transition-all"
                dir="auto"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 md:px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs md:text-sm rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                Explore
              </button>
            </div>
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

              {/* Lexicon Definitions Display (Starts immediately below header) */}
              <div className="space-y-4 md:space-y-6">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.dictId}
                    className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950/80 border border-emerald-500/20 rounded-2xl p-4 md:p-6 shadow-lg space-y-4 hover:border-emerald-500/35 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm md:text-base font-bold text-emerald-300/90 border-l-2 border-emerald-500/60 pl-2.5">
                          {entry.dictName}
                        </h3>
                        {entry.isEnglish && (
                          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            English
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyDefinition(entry.definitions.join('\n'), entry.dictName)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition text-xs font-medium text-zinc-300"
                          title="Copy Definition"
                        >
                          <Copy className="size-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        {!entry.isEnglish && (
                          <button
                            onClick={() => {
                              const cleanText = entry.definitions.join('\n').replace(/<[^>]*>?/gm, '');
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
                        <button
                          onClick={() => setAiChatContext({ root: activeRoot })}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition text-xs font-medium text-emerald-400 group"
                          title="Ask Lexicon Scholar"
                        >
                          <Bot className="size-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="hidden sm:inline">Ask Scholar</span>
                          <span className="sm:hidden">Ask</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {entry.definitions.map((def, dIdx) => (
                        <div key={dIdx} className="space-y-2">
                          <LexiconTextRenderer text={def} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-xl sticky top-[73px] max-h-[calc(100vh-100px)] flex flex-col">
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
