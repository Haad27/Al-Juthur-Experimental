'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LogoIcon from '@/components/svg/icons/LogoIcon';
import {
  Search,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  FileText,
  Filter,
  Compass,
  ChevronRight,
  Globe,
  Loader2,
  Copy,
  Languages,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DictionaryInfo {
  id: number;
  ident: string;
  name: string;
  info: string;
  is_hi_capable: boolean;
  ar_en: boolean;
  link: string;
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

  const [searchQuery, setSearchQuery] = useState(initialRoot);
  const [activeRoot, setActiveRoot] = useState(initialRoot);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RootLexiconResult | null>(null);
  const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
  const [selectedDictId, setSelectedDictId] = useState<number | 'all'>(1); // Default to Lane's
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'ar'>('all');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const rootParam = searchParams.get('root');
    if (rootParam && rootParam !== activeRoot) {
      setActiveRoot(rootParam);
      setSearchQuery(rootParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Fetch available dictionaries
    fetch('/api/lexicon/dictionaries')
      .then((r) => r.json())
      .then((data) => {
        if (data.dictionaries) {
          setDictionaries(data.dictionaries);
        }
      })
      .catch((e) => console.error('Failed to load dictionaries', e));
  }, []);

  useEffect(() => {
    if (activeRoot) {
      loadRootLexicon(activeRoot);
    }
  }, [activeRoot]);

  const loadRootLexicon = async (root: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lexicon/root/${encodeURIComponent(root)}`);
      const data = await res.json();
      setResult(data);
      // Auto-select first available dictionary if current selected isn't present
      if (data.entries && data.entries.length > 0) {
        setSelectedDictId(data.entries[0].dictId);
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

  const filteredEntries =
    result?.entries?.filter((entry) => {
      if (langFilter === 'en' && !entry.isEnglish) return false;
      if (langFilter === 'ar' && entry.isEnglish) return false;
      if (selectedDictId !== 'all' && entry.dictId !== selectedDictId) return false;
      return true;
    }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-10">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/80 px-4 md:px-8 py-3 mb-10">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoIcon className="w-8 h-8 rounded-[20%] hidden md:block" />
              <span className="font-bold text-xl tracking-tight text-white hidden md:block">Al-Juthur</span>
            </Link>
          </div>

          {/* Desktop Full Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-slate-400 text-sm">
            <Link href="/" className="cursor-pointer hover:text-slate-200 transition">
              Home
            </Link>
            <Link href="/surah/1" className="cursor-pointer hover:text-slate-200 transition">
              Read Quran
            </Link>
            <Link href="/tafsir" className="cursor-pointer hover:text-slate-200 transition">
              Tafsir
            </Link>
            <Link href="/lexicon" className="cursor-pointer text-white font-medium">
              Lexicon
            </Link>
            <Link href="/ai" className="cursor-pointer hover:text-slate-200 transition">
              AI Translator
            </Link>
          </nav>
        </div>
      </div>

      {/* Header section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Classical Quranic Lexicons & Linguistic Explorer
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Comprehensive <span className="text-emerald-400">Arabic Root</span> Lexicon
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg">
            Search across Lane&apos;s Lexicon, Lisan al-Arab, Maqayees al-Lugha, and 8 classical Arabic dictionaries with full Quranic morphological breakdowns.
          </p>
        </div>

        {/* Search & Popular Roots bar */}
        <div className="max-w-3xl mx-auto mb-10">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Arabic root (e.g. رحم, كتب, نور) or English transliteration..."
                className="w-full pl-12 pr-28 py-4 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-xl transition-all"
                dir="auto"
              />
              <button
                type="submit"
                className="absolute right-2.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                Explore
              </button>
            </div>
          </form>

          {/* Popular Roots Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Popular Roots:</span>
            {POPULAR_ROOTS.map((item) => (
              <button
                key={item.root}
                onClick={() => {
                  setSearchQuery(item.root);
                  setActiveRoot(item.root);
                }}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${activeRoot === item.root
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
              >
                <span className="font-arabic text-base">{item.root}</span>
                <span className="text-xs text-slate-400">({item.meaning})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Querying 11 Classical Dictionaries for root [{activeRoot}]...</p>
          </div>
        )}

        {/* Main Lexicon Content */}
        {!loading && result && result.entries && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / Dictionaries Navigation */}
            <div className="lg:col-span-4 space-y-6">
              {/* Root Summary Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Active Root
                  </span>
                  {result.structuredLane && (
                    <span className="text-xs font-medium text-slate-400">
                      Freq in Quran: <strong className="text-white">{result.structuredLane.quran_frequency}x</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-4xl font-bold font-arabic text-white tracking-wide">
                    {result.normalizedRoot}
                  </h2>
                  <span className="text-slate-400 text-sm font-mono">
                    [{result.normalizedRoot.split('').join(' - ')}]
                  </span>
                </div>

                {result.structuredLane?.summary_en ? (
                  <p className="text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                    {result.structuredLane.summary_en}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Lexical root found in {result.entries.length} classical Arabic and English dictionaries.
                  </p>
                )}
              </div>

              {/* Quranic Morphological Forms (if available) */}
              {result.structuredLane && result.structuredLane.morphological_forms.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Quranic Forms ({result.structuredLane.morphological_forms.length})
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {result.structuredLane.morphological_forms.map((form, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {form.form_name}
                          </div>
                          <div className="text-xs text-slate-400 capitalize">
                            {form.form_category} • {form.form_pattern}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-arabic font-bold text-emerald-300">
                            {form.example_word}
                          </div>
                          <div className="text-xs text-slate-400">
                            {form.occurrences} {form.occurrences === 1 ? 'verse' : 'verses'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dictionaries Picker */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Available Dictionaries
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    {result.entries.length} active
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedDictId('all')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${selectedDictId === 'all'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                      }`}
                  >
                    <span>All Dictionaries Combined</span>
                    <span className="text-xs opacity-80">{result.entries.length} books</span>
                  </button>

                  {result.entries.map((entry) => (
                    <button
                      key={entry.dictId}
                      onClick={() => setSelectedDictId(entry.dictId)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${selectedDictId === entry.dictId
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{entry.dictName}</span>
                        {entry.isEnglish && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-emerald-200">
                            EN
                          </span>
                        )}
                      </div>
                      <span className="text-xs opacity-75">
                        {entry.definitions.length} {entry.definitions.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Definition Display Panel */}
            <div className="lg:col-span-8 space-y-6">
              {/* Language / View Filter bar */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium mr-1">Filter Language:</span>
                  <button
                    onClick={() => setLangFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${langFilter === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                  >
                    All Languages
                  </button>
                  <button
                    onClick={() => setLangFilter('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${langFilter === 'en'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                  >
                    English (Lane&apos;s lexicon)
                  </button>
                  <button
                    onClick={() => setLangFilter('ar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${langFilter === 'ar'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                  >
                    Arabic Classical
                  </button>
                </div>

                <div className="text-xs text-slate-400">
                  Showing <strong className="text-white">{filteredEntries.length}</strong> dictionary sources
                </div>
              </div>

              {/* Lexicon Definitions Feed */}
              {filteredEntries.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-lg font-semibold text-slate-300">No definitions match current filter</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Try selecting &quot;All Dictionaries Combined&quot; or resetting the language filter above.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.dictId}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                    >
                      {/* Card Header */}
                      <div className="px-6 py-4 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            {entry.dictId}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              {entry.dictName}
                              {entry.isEnglish && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  English-Arabic
                                </span>
                              )}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              const rawText = entry.definitions.join("\n");
                              const cleanText = rawText.replace(/<[^>]*>?/gm, '');
                              navigator.clipboard.writeText(cleanText);
                              toast("Copied lexicon entry to clipboard!", { className: "bg-slate-800 text-white border-slate-700" });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-850 hover:bg-slate-750 border border-slate-700/60 transition text-xs font-medium text-slate-300"
                            title="Copy Entry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const rawText = entry.definitions.join("\n");
                              const cleanText = rawText.replace(/<[^>]*>?/gm, '');
                              sessionStorage.setItem("ai_translator_input", cleanText);
                              router.push("/ai");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition text-xs font-medium text-emerald-400"
                            title="Translate Entry"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            <span>Translate</span>
                          </button>
                        </div>
                      </div>

                      {/* Definition Content */}
                      <div className="p-6 space-y-6">
                        {entry.definitions.map((defText, defIdx) => (
                          <div
                            key={defIdx}
                            className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm sm:text-base border-b border-slate-800/60 last:border-0 pb-6 last:pb-0"
                            dir={entry.isEnglish ? 'ltr' : 'rtl'}
                            // Lexicon data contains basic HTML tags like <b> and <a>
                            dangerouslySetInnerHTML={{
                              __html: defText
                                .replace(/<a name="[^"]*"><\/a>/g, '')
                                .replace(/\n/g, '<br />'),
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading Lexicon Explorer...
        </div>
      }
    >
      <LexiconPageContent />
    </Suspense>
  );
}
