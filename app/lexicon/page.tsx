'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  ChevronRight,
  Loader2,
  Copy,
  BookOpenText,
  User,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import LexiconTextRenderer from '@/components/lexicon/LexiconTextRenderer';
import { amiriquran, inter } from '@/app/fonts';

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

  const { immersiveMode, setImmersiveMode } = useGlobalState();

  const [searchQuery, setSearchQuery] = useState(initialRoot);
  const [activeRoot, setActiveRoot] = useState(initialRoot);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RootLexiconResult | null>(null);
  const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
  const [pdfDictionaries, setPdfDictionaries] = useState<PdfDictionaryInfo[]>([]);
  const [selectedDictId, setSelectedDictId] = useState<number | 'all'>('all');
  const [showPdfSection, setShowPdfSection] = useState(false);

  // Scroll & Immersive navigation state
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

  // Scroll listener for headroom hide-on-scroll navigation
  useEffect(() => {
    setTopNavVisible(true);
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setReadingProgress(pct);

      if (scrollTop > lastScrollYRef.current && scrollTop > 80) {
        setTopNavVisible(false);
      } else {
        setTopNavVisible(true);
      }
      lastScrollYRef.current = scrollTop;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keyboard shortcut (R) for Lexicon Immersive Mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') {
        setImmersiveMode(!immersiveMode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [immersiveMode, setImmersiveMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => setImmersiveMode(false);
  }, [setImmersiveMode]);

  const loadRootLexicon = async (root: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lexicon/root/${encodeURIComponent(root)}`);
      const data = await res.json();
      setResult(data);
      setSelectedDictId('all');
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
  // LEXICON IMMERSIVE READING MODE
  // ==========================================
  if (immersiveMode) {
    return (
      <div className={`tafsir-immersive text-white min-h-screen ${inter.className}`}>
        {/* Reading Progress Bar (Fixed) */}
        <div
          className="fixed top-0 left-0 right-0 z-50 tafsir-reading-progress"
          style={{ width: `${readingProgress}%` }}
        />

        {/* Immersive Top Bar (Sticky Glassmorphism with Headroom) */}
        <div
          className={`sticky top-0 z-40 border-b px-4 md:px-8 py-3.5 transition-all duration-300 ${
            topNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
          }`}
          style={{
            background: 'rgba(15, 11, 7, 0.4)',
            borderColor: 'rgba(217, 119, 6, 0.25)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(217, 119, 6, 0.1)',
          }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setImmersiveMode(false)}
                className="flex items-center gap-1.5 text-amber-600/70 hover:text-amber-500 transition text-sm shrink-0"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline text-xs">Standard View</span>
              </button>
              <div className="h-4 w-px shrink-0" style={{ background: 'rgba(180,120,40,0.25)' }} />
              <div className="min-w-0 flex items-center gap-2">
                <p
                  className="text-lg font-bold font-arabic"
                  style={{ fontFamily: "'Amiri', serif", color: '#e8d0b0' }}
                >
                  {result?.normalizedRoot || activeRoot}
                </p>
                <span className="text-xs text-amber-500/80 font-mono">
                  [{result?.normalizedRoot.split('').join(' - ')}]
                </span>
              </div>
            </div>

            {/* Immersive Exit Button */}
            <button
              onClick={() => setImmersiveMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition shrink-0"
              title="Exit Immersive Mode (R)"
            >
              <X className="size-3.5" />
              <span>Exit</span>
              <span className="text-[10px] opacity-75 font-mono hidden md:inline">R</span>
            </button>
          </div>
        </div>

        {/* Immersive Main Reading Content */}
        <div className="tafsir-immersive-content max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-12">
          {/* Header Banner */}
          <div className="text-center space-y-4 border-b border-amber-500/20 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <Sparkles className="size-3.5" />
              <span>Classical Lexical Root Analysis</span>
            </div>
            <h1 className={`${amiriquran.className} text-5xl sm:text-6xl text-amber-100 tracking-wide font-normal`}>
              {result?.normalizedRoot}
            </h1>
            {result?.structuredLane?.summary_en && (
              <p className="text-amber-200/80 text-base max-w-xl mx-auto font-serif italic">
                &ldquo;{result.structuredLane.summary_en}&rdquo;
              </p>
            )}
            {result?.structuredLane && (
              <p className="text-xs text-amber-500/70 uppercase tracking-widest font-mono">
                Frequency in Quran: {result.structuredLane.quran_frequency} occurrences
              </p>
            )}
          </div>

          {/* Morphological Forms Pill Carousel */}
          {result?.structuredLane && result.structuredLane.morphological_forms.length > 0 && (
            <div className="space-y-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5">
              <h3 className="text-xs uppercase font-bold text-amber-400/90 tracking-widest flex items-center gap-2">
                <Layers className="size-4 text-amber-500" />
                Quranic Derivations ({result.structuredLane.morphological_forms.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.structuredLane.morphological_forms.map((form, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-amber-900/20 border border-amber-500/30 text-xs flex items-center gap-2"
                  >
                    <span className="font-bold text-amber-300 font-arabic">{form.example_word}</span>
                    <span className="text-amber-400/60">• {form.form_name}</span>
                    <span className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-400 font-mono">
                      {form.occurrences}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Definitions List */}
          <div className="space-y-10">
            {filteredEntries.map((entry, idx) => (
              <div key={entry.dictId || idx} className="space-y-4 border-b border-amber-500/15 pb-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2 font-serif">
                    <BookOpen className="size-4 text-amber-500" />
                    <span>{entry.dictName}</span>
                    {entry.isEnglish && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        EN
                      </span>
                    )}
                  </h2>
                </div>

                {entry.definitions.map((def, dIdx) => (
                  <div key={dIdx} className="tafsir-immersive-block visible pl-2 sm:pl-4">
                    <LexiconTextRenderer text={def} isImmersive={true} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STANDARD LEXICON MODE
  // ==========================================
  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-slate-100 pb-24 ${inter.className}`}>
      {/* Top Navigation Bar (Headroom Scroll Responsive) */}
      <div
        className={`sticky top-0 z-40 bg-zinc-950/40 border-b border-zinc-800/80 px-4 md:px-8 py-3 transition-all duration-300 ${
          topNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <LogoIcon className="w-7 h-7 rounded-[20%]" />
              <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">Al-Juthur</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Lexicon Explorer
            </span>
          </div>

          {/* Right Actions: Immersive Mode Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImmersiveMode(true)}
              className="tafsir-immersive-toggle tafsir-immersive-toggle-off !px-3 !py-1.5"
              title="Enter Lexicon Immersive Mode (R)"
            >
              <BookOpenText className="size-3.5" />
              <span>Immersive Mode</span>
              <span className="tafsir-kb-hint hidden sm:inline">R</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header & Search Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Title Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Classical <span className="text-emerald-400">Quranic Root</span> Lexicons
          </h1>
          <p className="max-w-xl mx-auto text-zinc-400 text-sm sm:text-base">
            Explore 11 classical Arabic & English dictionaries with morphologic Quranic breakdowns.
          </p>
        </div>

        {/* Search & Popular Roots bar */}
        <div className="max-w-3xl mx-auto mb-10">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Arabic root (e.g. رحم, كتب, نور)..."
                className="w-full pl-12 pr-28 py-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-base text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 shadow-lg transition-all"
                dir="auto"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                Explore
              </button>
            </div>
          </form>

          {/* Popular Roots Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1">Roots:</span>
            {POPULAR_ROOTS.map((item) => (
              <button
                key={item.root}
                onClick={() => {
                  setSearchQuery(item.root);
                  setActiveRoot(item.root);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
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

        {/* Main Content Layout */}
        {!loading && result && result.entries && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 
              MAIN DEFINITION CONTENT PANEL
              (Rendered FIRST on Mobile so primary content is immediately visible)
            */}
            <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
              {/* Active Root Banner */}
              <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 size-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      Active Root
                    </span>
                    <h2 className="text-4xl font-bold font-arabic text-white mt-2">
                      {result.normalizedRoot}
                    </h2>
                    {result.structuredLane?.summary_en && (
                      <p className="text-sm text-zinc-300 mt-2 leading-relaxed font-serif">
                        &ldquo;{result.structuredLane.summary_en}&rdquo;
                      </p>
                    )}
                  </div>

                  {result.structuredLane && (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 text-center shrink-0">
                      <div className="text-2xl font-bold text-emerald-400">
                        {result.structuredLane.quran_frequency}x
                      </div>
                      <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mt-0.5">
                        Quran Frequency
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dictionary Selector Tabs */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setSelectedDictId('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedDictId === 'all'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>All Dictionaries</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20">{result.entries.length}</span>
                </button>

                {result.entries.map((entry) => (
                  <button
                    key={entry.dictId}
                    onClick={() => setSelectedDictId(entry.dictId)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedDictId === entry.dictId
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{entry.dictName}</span>
                    {entry.isEnglish && (
                      <span className="text-[9px] font-bold px-1 rounded bg-white/10 text-emerald-200">
                        EN
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Dictionary Definition Entries Display */}
              <div className="space-y-6">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.dictId}
                    className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 md:p-7 shadow-lg space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="size-5 text-emerald-400" />
                        <h3 className="text-base font-bold text-white">{entry.dictName}</h3>
                        {entry.isEnglish && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            English
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyDefinition(entry.definitions.join('\n'), entry.dictName)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                        title="Copy Definition"
                      >
                        <Copy className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {entry.definitions.map((def, dIdx) => (
                        <div key={dIdx} className="space-y-2">
                          <LexiconTextRenderer text={def} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile PDF Reference Lexicons Collapsible Section */}
              {pdfDictionaries.length > 0 && (
                <div className="lg:hidden bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-lg mt-8">
                  <button
                    onClick={() => setShowPdfSection(!showPdfSection)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        PDF Reference Lexicons ({pdfDictionaries.length})
                      </h3>
                    </div>
                    {showPdfSection ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                  </button>

                  {showPdfSection && (
                    <div className="space-y-3 mt-4 pt-4 border-t border-zinc-800">
                      {pdfDictionaries.map((pdf) => (
                        <div
                          key={pdf.id}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-white">{pdf.name}</h4>
                            <p className="text-[11px] text-zinc-400">{pdf.author}</p>
                          </div>
                          <a
                            href={`/api/lexicon/pdf?file=${encodeURIComponent(pdf.filePath)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-xs font-medium shrink-0"
                          >
                            <span>Open PDF</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 
              SIDEBAR PANEL
              (Quranic Morphological Forms & Desktop PDF References)
            */}
            <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
              {/* Quranic Morphological Forms */}
              {result.structuredLane && result.structuredLane.morphological_forms.length > 0 && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2 mb-4">
                    <Layers className="size-4 text-emerald-400" />
                    Quranic Derivations ({result.structuredLane.morphological_forms.length})
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {result.structuredLane.morphological_forms.map((form, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{form.form_name}</div>
                          <div className="text-[11px] text-zinc-400 capitalize">
                            {form.form_category} • {form.form_pattern}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-arabic font-bold text-emerald-300">
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

              {/* Desktop PDF Reference Lexicons */}
              {pdfDictionaries.length > 0 && (
                <div className="hidden lg:block bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                      <FileText className="size-4 text-emerald-400" />
                      PDF Reference Lexicons ({pdfDictionaries.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pdfDictionaries.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-white">{pdf.name}</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{pdf.author}</p>
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
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800 mt-1">
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
