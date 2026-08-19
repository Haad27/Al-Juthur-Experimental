'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Languages, Loader2, ArrowRightLeft, ShieldAlert, Copy, Check, LayoutGrid, Columns, BookOpen, Sparkles, Trash, ScrollText, Library, AlertTriangle, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import { cn, copyToClipboard } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import LogoIcon from '@/components/svg/icons/LogoIcon';

function AiTranslatorContent() {
  const searchParams = useSearchParams();
  
  const {
    aiInputText,
    setAiInputText,
    aiTranslationData,
    aiIsTranslating,
    aiUntranslatedText,
    aiError,
    triggerAiTranslation,
    loadCachedAiTranslation,
    clearAiTranslation,
  } = useGlobalState();

  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'english'>('table');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);

  useEffect(() => {
    const inputParam = searchParams.get('input');
    const sessionInput = typeof window !== 'undefined' ? sessionStorage.getItem('ai_translator_input') : null;
    const sessionRawMarkdown = typeof window !== 'undefined' ? sessionStorage.getItem('ai_translator_raw_markdown') : null;
    const targetText = sessionInput || inputParam;

    if (sessionInput) {
      sessionStorage.removeItem('ai_translator_input');
    }
    if (sessionRawMarkdown) {
      sessionStorage.removeItem('ai_translator_raw_markdown');
    }

    if (targetText && targetText.trim()) {
      if (sessionRawMarkdown) {
        loadCachedAiTranslation(targetText, sessionRawMarkdown);
      } else {
        triggerAiTranslation(targetText);
      }
    }
  }, [searchParams, triggerAiTranslation, loadCachedAiTranslation]);

  // Auto scroll down to translation results whenever translation starts
  useEffect(() => {
    if (aiIsTranslating) {
      const timer = setTimeout(() => {
        document.getElementById('ai-results-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [aiIsTranslating]);

  const fetchQuota = () => {
    fetch('/api/ai/translate')
      .then(res => res.json())
      .then(data => {
        if (data.success && typeof data.remaining === 'number') {
          setRemainingTokens(data.remaining);
          if (data.limit) setTokenLimit(data.limit);
        }
      })
      .catch(() => {
        // Silently fail - token count will show once quota API responds
      });
  };

  const isDummyText = (str?: string) => {
    if (!str) return true;
    const trimmed = str.trim();
    if (!trimmed || trimmed === '...' || trimmed === '---' || trimmed === '***') return true;
    const norm = trimmed.toLowerCase().replace(/[\*\[\]\(\)\:\-\_\s\"\'\`]/g, '');
    const dummyKeywords = new Set([
      'text', 'originaltext', 'transcreatedtext', 'translation', 'englishtranslation',
      'english', 'arabic', 'arabictext', 'englishtext', 'sourcetext', 'sourcefragments',
      'sourcefragment', 'transcreation', 'meaning', 'content', 'verse', 'ayah', 'title',
      'heading', 'section', 'paragraph', 'row', 'row1', 'row2', 'row3', 'readytogenerate',
      'ready', 'na', 'none', 'null', 'placeholder', 'inserttranslation', 'inserttext',
      'sample', 'outputmarkdowntable', 'table', 'markdowntable', 'thecombinedtranslation', 'waittheprompt'
    ]);
    if (dummyKeywords.has(norm)) return true;
    if (/^\[?\s*(?:text|translation|english|transcreation|source|row\s*\d+|section\s*\d+|paragraph\s*\d+)\s*\]?$/i.test(trimmed)) {
      return true;
    }
    return false;
  };

  const cleanTranslationData = React.useMemo(() => {
    if (!aiTranslationData) return [];
    return aiTranslationData.filter((row, idx) => {
      if (!row.transcreatedText || isDummyText(row.transcreatedText)) return false;
      // If a later row has the identical sourceText, drop this earlier row
      const laterDuplicate = aiTranslationData.slice(idx + 1).some(later => 
        later.sourceText && row.sourceText && later.sourceText.trim() === row.sourceText.trim()
      );
      if (laterDuplicate) return false;
      return true;
    });
  }, [aiTranslationData]);

  useEffect(() => {
    fetchQuota();
  }, []);

  useEffect(() => {
    if (!aiIsTranslating && cleanTranslationData && cleanTranslationData.length > 0) {
      fetchQuota();
    }
  }, [aiIsTranslating, cleanTranslationData]);

  const copySegment = (text: string, index: string) => {
    copyToClipboard(text, "Translation segment copied!");
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = (format: 'english' | 'reader' | 'split') => {
    if (!cleanTranslationData || cleanTranslationData.length === 0) return;
    let textToCopy = '';
    
    if (format === 'english') {
      textToCopy = cleanTranslationData.map(row => row.transcreatedText).join('\n\n');
    } else if (format === 'reader') {
      textToCopy = cleanTranslationData.map(row => `${row.sourceText}\n\n${row.transcreatedText}`).join('\n\n---\n\n');
    } else if (format === 'split') {
      textToCopy = cleanTranslationData.map(row => `${row.transcreatedText}\n\n${row.sourceText}`).join('\n\n---\n\n');
    }

    copyToClipboard(textToCopy, `Copied all translations in ${format} format!`);
    setCopiedIndex(`all-${format}`);
    toast(`Copied all translations in ${format} format!`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-36 md:pb-10 relative selection:bg-emerald-500/30">
      {/* Subtle ambient light background */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
      {/* Top Navigation Bar */}
      <div className="hidden md:block sticky top-0 z-40 bg-zinc-950/50 backdrop-blur-3xl border-b border-zinc-800/80 px-4 md:px-8 py-3 shadow-sm">
        <div className="max-w-[1700px] mx-auto relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo and App Name */}
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center gap-2">
              <LogoIcon className="w-8 h-8 rounded-[20%] hidden md:block" />
              <span className="font-bold text-xl tracking-tight text-white hidden md:block">Al-Juthur</span>
            </Link>
          </div>

          {/* Desktop Full Navigation */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-zinc-400 text-sm font-medium">
            <Link href="/home" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              Home
            </Link>
            <Link href="/tafsir" className="cursor-pointer hover:text-gray-300 transition">
              Tafsir
            </Link>
            <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition">
              Lexicon
            </Link>
            <Link href="/ai" className="cursor-pointer text-white font-medium">
              Translator
            </Link>
            <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              RAG Bot
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link 
              href="/saved" 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition shadow-sm"
              title="Saved Verses, Tafsirs & Scholar Notes"
            >
              <Bookmark className="size-3.5 text-emerald-400" />
              <span>Saved Library</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col p-[clamp(0.5rem,2vh,1.5rem)] max-w-5xl mx-auto w-full gap-[clamp(0.5rem,2vh,1.5rem)]">
        
        {/* The Input Portal */}
        <div className={`flex flex-col items-center w-full animate-fadeIn max-w-4xl mx-auto transition-all duration-700 ${(aiIsTranslating || (aiTranslationData && aiTranslationData.length > 0)) ? "mt-4 mb-4" : "justify-center min-h-[70vh]"}`}>
            {/* Header section */}
            <div className="text-center space-y-2 mb-6 w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <Sparkles className="w-3 h-3" />
                AI Translation
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Classical Arabic <span className="text-emerald-400">AI Translator</span>
              </h1>
              <p className="max-w-xl mx-auto text-zinc-500 text-xs sm:text-sm mt-1 sm:mt-2">
                Paste classical Arabic Tafsir, Lexicon passages, or ancient Islamic texts. Watch the AI transcreate them into English.
              </p>
              
              {/* Token limit */}
              {remainingTokens !== null && (
                <div className="flex items-center justify-center pt-2">
                  <div className="flex items-center gap-1.5 bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-800/50 text-emerald-500/80 text-[10px] sm:text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      <strong className="text-zinc-300">{remainingTokens.toLocaleString()}</strong> / {tokenLimit.toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-4 relative group">
              {/* Decorative glows behind input */}
              <div className={`absolute -inset-1 bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-emerald-500/40 rounded-[2.2rem] transition-all duration-700 ${aiIsTranslating ? "blur-2xl opacity-90 animate-pulse" : "blur-xl group-hover:blur-2xl opacity-75 sm:opacity-40 group-hover:opacity-80"}`} />
              
              <div className="relative flex flex-col bg-zinc-950/90 backdrop-blur-2xl border-2 border-emerald-500/60 sm:border-zinc-800/80 group-hover:border-emerald-500/60 rounded-3xl p-[min(0.5rem,1vh)] transition-all duration-500 shadow-[0_0_30px_rgba(16,185,129,0.25)] sm:shadow-2xl">
                <div className="flex justify-between items-center px-6 pt-[min(1rem,2vh)] pb-[min(0.5rem,1vh)] border-b border-zinc-800/50">
                  <label className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Source Text</label>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Secure
                  </div>
                </div>
                <textarea
                  className="w-full h-[25vh] min-h-[100px] max-h-[300px] bg-transparent p-[min(1.5rem,3vh)] text-white placeholder-zinc-700 focus:outline-none resize-none font-serif text-base sm:text-[clamp(1.25rem,3vh,1.875rem)] leading-loose"
                  dir="auto"
                  placeholder="Paste classical Arabic text here..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                />
                <div className="flex justify-between items-center px-4 pb-[min(1rem,2vh)] pt-[min(0.5rem,1vh)]">
                  <button
                    onClick={() => clearAiTranslation()}
                    disabled={!aiInputText.trim()}
                    className="group flex items-center justify-center gap-2 px-5 py-[min(0.625rem,1.5vh)] bg-transparent hover:bg-zinc-900/50 disabled:opacity-50 disabled:hover:bg-transparent text-zinc-500 hover:text-zinc-300 font-medium rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      if (aiIsTranslating) return;
                      triggerAiTranslation(aiInputText);
                    }}
                    disabled={aiIsTranslating || !aiInputText.trim()}
                    className={cn(
                      "group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-[min(1rem,2vh)] font-bold rounded-2xl transition-all duration-300 transform active:translate-y-0 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] cursor-pointer hover:-translate-y-1",
                      aiIsTranslating
                        ? "bg-zinc-900/90 border border-emerald-500/50 text-emerald-400 opacity-90 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none"
                        : "bg-gradient-to-r from-emerald-600 to-teal-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:border disabled:shadow-none disabled:hover:translate-y-0"
                    )}
                  >
                    <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    {aiIsTranslating ? (
                      <>
                        <Loader2 className="w-[min(1.25rem,2.5vh)] h-[min(1.25rem,2.5vh)] text-emerald-400 animate-spin relative z-10 shrink-0" />
                        <span className="relative z-10 text-[clamp(1rem,2vh,1.125rem)] text-emerald-300 font-semibold">Translating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-[min(1.25rem,2.5vh)] h-[min(1.25rem,2.5vh)] relative z-10" />
                        <span className="relative z-10 text-[clamp(1rem,2vh,1.125rem)]">Translate Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            {(!aiIsTranslating && (!aiTranslationData || aiTranslationData.length === 0)) && (
              <div className="flex flex-row gap-2 sm:gap-6 mt-[min(2rem,4vh)] w-full justify-center px-2 sm:px-0">
                <Link href="/tafsir" className="animate-bounce group relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-8 py-[min(0.75rem,2vh)] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 border border-emerald-500/30 hover:border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] active:translate-y-0 overflow-hidden backdrop-blur-sm text-center">
                  <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300 relative z-10 shrink-0" />
                  <span className="text-[10px] sm:text-[clamp(0.875rem,2vh,1rem)] tracking-wide relative z-10 leading-tight">Get Arabic<br className="block sm:hidden" /> from Tafsir</span>
                </Link>
                <Link href="/lexicon" className="animate-bounce [animation-delay:150ms] group relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-8 py-[min(0.75rem,2vh)] bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 hover:text-teal-200 font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 border border-teal-500/30 hover:border-teal-400/50 shadow-[0_0_15px_rgba(20,184,166,0.15)] hover:shadow-[0_0_25px_rgba(20,184,166,0.3)] active:translate-y-0 overflow-hidden backdrop-blur-sm text-center">
                  <Library className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 group-hover:text-teal-300 transition-colors duration-300 relative z-10 shrink-0" />
                  <span className="text-[10px] sm:text-[clamp(0.875rem,2vh,1rem)] tracking-wide relative z-10 leading-tight">Get Arabic<br className="block sm:hidden" /> from Lexicon</span>
                </Link>
              </div>
            )}
          </div>

        {/* Error State */}
        {aiError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {aiError}
          </div>
        )}

        {/* The Zenith Results */}
        {((cleanTranslationData && cleanTranslationData.length > 0) || aiIsTranslating) && (
          <div id="ai-results-container" className="mt-6 flex flex-col gap-6 animate-fadeIn pb-24">
            {/* Initial Stream Loading State */}
            {aiIsTranslating && (!cleanTranslationData || cleanTranslationData.length === 0) && (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl backdrop-blur-xl animate-pulse space-y-4 shadow-2xl text-center max-w-2xl mx-auto">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm font-semibold text-emerald-300">
                  Translating classical text with Islamic scholarship accuracy...
                </p>
                <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl px-5 py-3 text-xs text-zinc-300 space-y-1.5 backdrop-blur-md shadow-inner">
                  <p className="font-medium text-emerald-200 flex items-center justify-center gap-1.5">
                    <span>⏳</span> The AI is reviewing the text thoroughly. This may take 30+ seconds.
                  </p>
                  <p className="text-zinc-400">
                    You may explore the app while it translates — we will notify you when it's done!
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar (Sticky Top - Snaps flush directly to top on mobile, and underneath navbar on desktop) */}
            <div className="sticky top-0 md:top-[49px] z-30 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-950/95 sm:bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl gap-2.5 sm:gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <h2 className="text-xs sm:text-xl font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <span>Translation Result</span>
                  {aiIsTranslating && (
                    <span className="flex h-2 w-2 relative ml-0.5" title="Streaming...">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-semibold shadow-sm backdrop-blur-sm ml-1.5">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                    <span><strong className="text-emerald-200">{(tokenLimit - (remainingTokens ?? tokenLimit)).toLocaleString()}</strong> / {tokenLimit.toLocaleString()} used</span>
                  </span>
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/50">
                {/* Row 1 on Mobile: Global Copy Actions */}
                <div className="flex items-center justify-between sm:justify-start p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-inner backdrop-blur-md w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-zinc-500 px-2 uppercase tracking-widest hidden md:block">Copy</span>
                  <div className="flex items-center justify-around sm:justify-start w-full sm:w-auto gap-1">
                    <button
                      onClick={() => copyAll('english')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400"
                      title="Copy English Only"
                    >
                      {copiedIndex === 'all-english' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />}
                      <span>English</span>
                    </button>
                    <button
                      onClick={() => copyAll('reader')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400"
                      title="Copy Reader Mode Format"
                    >
                      {copiedIndex === 'all-reader' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />}
                      <span>Reader</span>
                    </button>
                    <button
                      onClick={() => copyAll('split')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-400"
                      title="Copy Split Mode Format"
                    >
                      {copiedIndex === 'all-split' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />}
                      <span>Split</span>
                    </button>
                  </div>
                </div>

                {/* Row 2 on Mobile: Layout Toggles */}
                <div className="flex items-center justify-around sm:justify-start p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-zinc-900/60 border border-zinc-800/80 shadow-inner backdrop-blur-md w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'cards' ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Reader</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    title="Table view"
                  >
                    <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Classic</span>
                  </button>
                  <button
                    onClick={() => setViewMode('english')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'english' ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                    title="English only view"
                  >
                    <ScrollText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>English</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rendering: Reader Mode (Cards) */}
            {viewMode === 'cards' ? (
              <div className="flex flex-col gap-8">
                {cleanTranslationData.map((row, idx) => (
                  <div key={idx} className="relative overflow-hidden bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-10 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)] space-y-8 shadow-2xl backdrop-blur-xl group animate-fadeIn">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {/* Arabic Box */}
                    <div className="relative border-r-4 border-emerald-400 sm:border-emerald-500/50 pr-6 md:pr-8 text-right group/arabic" dir="rtl">
                      <div className="absolute inset-0 bg-emerald-500/20 sm:bg-emerald-500/10 blur-2xl sm:blur-3xl opacity-100 sm:opacity-0 group-hover/arabic:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="font-mushaf-indopak-16 text-3xl md:text-4xl leading-relaxed text-emerald-50 tracking-wide drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] relative z-10 [&>p]:mb-4 [&>h1]:text-4xl [&>h1]:font-bold [&>h2]:text-3xl [&>h2]:font-bold [&>h3]:text-2xl [&>h3]:font-bold">
                        <ReactMarkdown>{row.sourceText}</ReactMarkdown>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="relative h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent w-full" />
                    {/* English Box */}
                    <div className="relative pl-2 md:pl-4 group/english">
                      <div className="absolute inset-0 bg-emerald-500/5 blur-2xl opacity-0 group-hover/english:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="text-zinc-300 leading-loose text-base md:text-lg font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                        <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live Streaming Dots Indicator for Cards */}
                {aiIsTranslating && (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-zinc-900/40 border border-emerald-500/30 text-emerald-400 backdrop-blur-xl animate-pulse text-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-300">AI is actively translating the next section...</span>
                    <span className="text-xs text-zinc-500">Live streaming in progress</span>
                  </div>
                )}
              </div>
            ) : viewMode === 'table' ? (
              /* Rendering: Classic Split (Table) */
              <div className="w-full overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-800/80">
                      <th className="p-6 font-bold text-xs text-zinc-400 w-1/2 border-r border-zinc-800/80 uppercase tracking-widest">English Translation</th>
                      <th className="p-6 font-bold text-xs text-emerald-400 w-1/2 text-right uppercase tracking-widest">Original Arabic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {cleanTranslationData.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-zinc-800/40 transition-colors duration-300">
                        <td className="p-6 md:p-8 align-top text-base leading-relaxed text-zinc-300 border-r border-zinc-800/80 relative group/td-en">
                          <div className="absolute inset-0 bg-emerald-500/5 blur-2xl opacity-0 group-hover/td-en:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/0 group-hover:bg-emerald-500/40 transition-colors duration-300" />
                          <div className="relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                            <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                          </div>
                        </td>
                        <td className="p-6 md:p-8 align-top text-right relative group/td-ar" dir="rtl">
                          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl opacity-0 group-hover/td-ar:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          <div className="relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] font-mushaf-indopak-16 text-2xl md:text-3xl leading-loose text-emerald-50 [&>p]:mb-4 [&>h1]:text-3xl [&>h1]:font-bold [&>h2]:text-2xl [&>h2]:font-bold [&>h3]:text-xl [&>h3]:font-bold">
                            <ReactMarkdown>{row.sourceText}</ReactMarkdown>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Live Streaming Dots Indicator for Table */}
                    {aiIsTranslating && (
                      <tr className="bg-emerald-950/20 border-t border-emerald-500/30 animate-pulse">
                        <td colSpan={2} className="p-6 md:p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-emerald-400">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                            </div>
                            <span className="text-sm font-semibold text-emerald-300">AI is actively translating the next section...</span>
                            <span className="text-xs text-zinc-500">Live streaming in progress</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Rendering: English Only */
              <div className="flex flex-col gap-6">
                {cleanTranslationData.map((row, idx) => (
                  <div key={idx} className="relative overflow-hidden bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)] shadow-2xl backdrop-blur-xl group animate-fadeIn">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative group/english">
                      <div className="absolute inset-0 bg-emerald-500/5 blur-2xl opacity-0 group-hover/english:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="text-zinc-300 leading-loose text-base md:text-lg font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                        <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live Streaming Dots Indicator for English Only */}
                {aiIsTranslating && (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-zinc-900/40 border border-emerald-500/30 text-emerald-400 backdrop-blur-xl animate-pulse text-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-300">AI is actively translating the next section...</span>
                    <span className="text-xs text-zinc-500">Live streaming in progress</span>
                  </div>
                )}
              </div>
            )}

            {/* Truncation Action CTA Card */}
            {aiUntranslatedText && (
              <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-fadeIn text-center mt-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base md:text-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Partial Translation Complete</span>
                </div>
                <p className="text-xs md:text-sm text-zinc-300 max-w-xl leading-relaxed">
                  Your input text was long, so we translated the first section. Click below to continue seamlessly from where it left off!
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
                  <button
                    onClick={() => {
                      triggerAiTranslation(aiUntranslatedText, true);
                    }}
                    disabled={aiIsTranslating}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer w-full sm:w-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Continue Translating the Rest</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiUntranslatedText);
                      toast.success("Remaining untranslated portion copied to clipboard!");
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs sm:text-sm rounded-2xl border border-zinc-800 transition-all cursor-pointer w-full sm:w-auto"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Remaining Text</span>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}

      </main>
    </div>
  );
}

export default function AiTranslatorPage() {
  return (
    <React.Suspense fallback={null}>
      <AiTranslatorContent />
    </React.Suspense>
  );
}
