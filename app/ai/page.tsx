'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Languages, Loader2, ArrowRightLeft, ShieldAlert, Copy, Check, LayoutGrid, Columns, BookOpen, Sparkles, Trash, ScrollText, Library, AlertTriangle, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import { cn, copyToClipboard } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import AppHeader from '@/components/layout/AppHeader';

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
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-36 md:pb-10 relative">
      <AppHeader />

      <main className="flex-1 flex flex-col p-[clamp(0.5rem,2vh,1.5rem)] max-w-5xl mx-auto w-full gap-[clamp(0.5rem,2vh,1.5rem)]">
        
        {/* The Input Portal */}
        <div className={`flex flex-col items-center w-full animate-fadeIn max-w-4xl mx-auto transition-all duration-700 ${(aiIsTranslating || (aiTranslationData && aiTranslationData.length > 0)) ? "mt-4 mb-4" : "justify-center min-h-[70vh]"}`}>
            {/* Header section */}
            <div className="text-center space-y-2 mb-6 w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-semibold tracking-widest uppercase ">
                <Sparkles className="w-3 h-3" />
                AI Translation
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Classical Arabic AI Translator
              </h1>
              <p className="max-w-xl mx-auto text-muted-foreground text-xs sm:text-sm mt-1 sm:mt-2 leading-[1.7]">
                Paste classical Arabic Tafsir, Lexicon passages, or ancient Islamic texts. Watch the AI transcreate them into English.
              </p>
              
              {/* Token limit */}
              {remainingTokens !== null && (
                <div className="flex items-center justify-center pt-2">
                  <div className="flex items-center gap-1.5 bg-card/40 px-3 py-1 rounded-full border border-border/50 text-accent text-[10px] sm:text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      <strong className="text-reading">{remainingTokens.toLocaleString()}</strong> / {tokenLimit.toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col gap-4 relative group">
              {/* Decorative glows behind input */}
              <div className={`absolute -inset-1 rounded-[2.2rem] bg-accent/10 transition-opacity duration-500 ${aiIsTranslating ? "opacity-80" : "opacity-0 group-hover:opacity-50"}`} />
              
              <div className="relative flex flex-col bg-background/90 backdrop-blur-2xl border-2 border-accent/50 sm:border-border group-hover:border-accent/50 rounded-3xl p-[min(0.5rem,1vh)] transition-all duration-500  sm:shadow-2xl">
                <div className="flex justify-between items-center px-6 pt-[min(1rem,2vh)] pb-[min(0.5rem,1vh)] border-b border-border/50">
                  <label className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Source Text</label>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Secure
                  </div>
                </div>
                <textarea
                  className="w-full h-[25vh] min-h-[100px] max-h-[300px] bg-transparent p-[min(1.5rem,3vh)] text-foreground placeholder-muted-foreground focus:outline-none resize-none font-serif text-base sm:text-[clamp(1.25rem,3vh,1.875rem)] leading-loose"
                  dir="auto"
                  placeholder="Paste classical Arabic text here..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                />
                <div className="flex justify-between items-center px-4 pb-[min(1rem,2vh)] pt-[min(0.5rem,1vh)]">
                  <button
                    onClick={() => clearAiTranslation()}
                    disabled={!aiInputText.trim()}
                    className="group flex items-center justify-center gap-2 px-5 py-[min(0.625rem,1.5vh)] bg-transparent hover:bg-card/50 disabled:opacity-50 disabled:hover:bg-transparent text-muted-foreground hover:text-reading font-medium rounded-xl transition-all duration-300 cursor-pointer"
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
                      "group relative overflow-hidden flex items-center justify-center gap-3 px-8 py-[min(1rem,2vh)] font-bold rounded-2xl transition-all duration-300 transform active:translate-y-0 text-foreground   cursor-pointer hover:-translate-y-1",
                      aiIsTranslating
                        ? "bg-card border border-accent/40 text-accent opacity-90 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none"
                        : "bg-accent disabled:bg-muted disabled:text-muted-foreground disabled:border-border disabled:border disabled:shadow-none disabled:hover:translate-y-0"
                    )}
                  >
                    <div className="absolute inset-0 bg-accent/30 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    {aiIsTranslating ? (
                      <>
                        <Loader2 className="w-[min(1.25rem,2.5vh)] h-[min(1.25rem,2.5vh)] text-accent animate-spin relative z-10 shrink-0" />
                        <span className="relative z-10 text-[clamp(1rem,2vh,1.125rem)] text-accent font-semibold">Translating...</span>
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
                <Link href="/tafsir" className="group relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-8 py-[min(0.75rem,2vh)] bg-accent/10 hover:bg-accent/15 text-accent font-semibold rounded-xl sm:rounded-2xl transition-colors duration-200 border border-accent/30 hover:border-accent/50 text-center">
                  <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 text-accent group-hover:text-accent transition-colors duration-300 relative z-10 shrink-0" />
                  <span className="text-[10px] sm:text-[clamp(0.875rem,2vh,1rem)] tracking-wide relative z-10 leading-tight">Get Arabic<br className="block sm:hidden" /> from Tafsir</span>
                </Link>
                <Link href="/lexicon" className="group relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-8 py-[min(0.75rem,2vh)] bg-card hover:bg-muted text-foreground font-semibold rounded-xl sm:rounded-2xl transition-colors duration-200 border border-border hover:border-accent/40 text-center">
                  <Library className="w-4 h-4 sm:w-5 sm:h-5 text-accent relative z-10 shrink-0" />
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
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-card/50 border border-border rounded-3xl backdrop-blur-xl animate-pulse space-y-4 shadow-2xl text-center max-w-2xl mx-auto">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-sm font-semibold text-accent">
                  Translating classical text with Islamic scholarship accuracy...
                </p>
                <div className="bg-accent/10 border border-accent/30 rounded-2xl px-5 py-3 text-xs text-reading space-y-1.5 backdrop-blur-md shadow-inner">
                  <p className="font-medium text-arabic flex items-center justify-center gap-1.5">
                    <span>⏳</span> The AI is reviewing the text thoroughly. This may take 30+ seconds.
                  </p>
                  <p className="text-muted-foreground">
                    You may explore the app while it translates — we will notify you when it's done!
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar (Sticky Top - Snaps flush directly to top on mobile, and underneath navbar on desktop) */}
            <div className="sticky top-0 md:top-[49px] z-30 flex flex-col sm:flex-row sm:items-center justify-between bg-popover sm:bg-background/80 backdrop-blur-xl border border-border rounded-2xl p-2.5 sm:p-3 shadow-2xl gap-2.5 sm:gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                <h2 className="text-xs sm:text-xl font-bold text-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-accent shrink-0" />
                  <span>Translation Result</span>
                  {aiIsTranslating && (
                    <span className="flex h-2 w-2 relative ml-0.5" title="Streaming...">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/40 text-accent text-[10px] sm:text-xs font-semibold ml-1.5">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent shrink-0" />
                    <span><strong className="text-arabic">{(tokenLimit - (remainingTokens ?? tokenLimit)).toLocaleString()}</strong> / {tokenLimit.toLocaleString()} used</span>
                  </span>
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                {/* Row 1 on Mobile: Global Copy Actions */}
                <div className="flex items-center justify-between sm:justify-start p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-card/70 border border-border shadow-inner backdrop-blur-md w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-widest hidden md:block">Copy</span>
                  <div className="flex items-center justify-around sm:justify-start w-full sm:w-auto gap-1">
                    <button
                      onClick={() => copyAll('english')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-accent/15 hover:text-accent text-muted-foreground"
                      title="Copy English Only"
                    >
                      {copiedIndex === 'all-english' ? <Check className="w-3.5 h-3.5 text-accent shrink-0" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />}
                      <span>English</span>
                    </button>
                    <button
                      onClick={() => copyAll('reader')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-accent/15 hover:text-accent text-muted-foreground"
                      title="Copy Reader Mode Format"
                    >
                      {copiedIndex === 'all-reader' ? <Check className="w-3.5 h-3.5 text-accent shrink-0" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />}
                      <span>Reader</span>
                    </button>
                    <button
                      onClick={() => copyAll('split')}
                      className="group flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 hover:bg-accent/15 hover:text-accent text-muted-foreground"
                      title="Copy Split Mode Format"
                    >
                      {copiedIndex === 'all-split' ? <Check className="w-3.5 h-3.5 text-accent shrink-0" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />}
                      <span>Split</span>
                    </button>
                  </div>
                </div>

                {/* Row 2 on Mobile: Layout Toggles */}
                <div className="flex items-center justify-around sm:justify-start p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-card/70 border border-border shadow-inner backdrop-blur-md w-full sm:w-auto">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'cards' ? 'bg-accent/15 text-accent ' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Reader</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'table' ? 'bg-accent/15 text-accent ' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    title="Table view"
                  >
                    <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Classic</span>
                  </button>
                  <button
                    onClick={() => setViewMode('english')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'english' ? 'bg-accent/15 text-accent ' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                  <div key={idx} className="relative overflow-hidden bg-card/50 border border-border rounded-3xl p-6 md:p-10 hover:border-accent/40 transition-all duration-500  space-y-8 shadow-2xl backdrop-blur-xl group animate-fadeIn">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {/* Arabic Box */}
                    <div className="relative border-r-4 border-accent sm:border-accent/40 pr-6 md:pr-8 text-right group/arabic" dir="rtl">
                      <div className="absolute inset-0 bg-accent/15 sm:bg-accent/10 blur-2xl sm:blur-3xl opacity-100 sm:opacity-0 group-hover/arabic:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="font-mushaf-indopak-16 text-3xl md:text-4xl leading-relaxed text-arabic tracking-wide relative z-10 [&>p]:mb-4 [&>h1]:text-4xl [&>h1]:font-bold [&>h2]:text-3xl [&>h2]:font-bold [&>h3]:text-2xl [&>h3]:font-bold">
                        <ReactMarkdown>{row.sourceText}</ReactMarkdown>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="relative h-px bg-border w-full" />
                    {/* English Box */}
                    <div className="relative pl-2 md:pl-4 group/english">
                      <div className="absolute inset-0 bg-accent/10 blur-2xl opacity-0 group-hover/english:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="text-reading leading-loose text-base md:text-lg font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                        <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live Streaming Dots Indicator for Cards */}
                {aiIsTranslating && (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-card/50 border border-accent/30 text-accent backdrop-blur-xl animate-pulse text-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" />
                    </div>
                    <span className="text-sm font-semibold text-accent">AI is actively translating the next section...</span>
                    <span className="text-xs text-muted-foreground">Live streaming in progress</span>
                  </div>
                )}
              </div>
            ) : viewMode === 'table' ? (
              /* Rendering: Classic Split (Table) */
              <div className="w-full overflow-hidden rounded-3xl border border-border bg-card/50 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-card/90 border-b border-border">
                      <th className="p-6 font-bold text-xs text-muted-foreground w-1/2 border-r border-border uppercase tracking-widest">English Translation</th>
                      <th className="p-6 font-bold text-xs text-accent w-1/2 text-right uppercase tracking-widest">Original Arabic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cleanTranslationData.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-muted/60 transition-colors duration-300">
                        <td className="p-6 md:p-8 align-top text-base leading-relaxed text-reading border-r border-border relative group/td-en">
                          <div className="absolute inset-0 bg-accent/10 blur-2xl opacity-0 group-hover/td-en:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          <div className="absolute inset-y-0 left-0 w-1 bg-accent/0 group-hover:bg-accent/40 transition-colors duration-300" />
                          <div className="relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                            <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                          </div>
                        </td>
                        <td className="p-6 md:p-8 align-top text-right relative group/td-ar" dir="rtl">
                          <div className="absolute inset-0 bg-accent/10 blur-3xl opacity-0 group-hover/td-ar:opacity-100 transition-opacity duration-500 pointer-events-none" />
                          <div className="relative z-10 font-mushaf-indopak-16 text-2xl md:text-3xl leading-loose text-arabic [&>p]:mb-4 [&>h1]:text-3xl [&>h1]:font-bold [&>h2]:text-2xl [&>h2]:font-bold [&>h3]:text-xl [&>h3]:font-bold">
                            <ReactMarkdown>{row.sourceText}</ReactMarkdown>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Live Streaming Dots Indicator for Table */}
                    {aiIsTranslating && (
                      <tr className="bg-accent/10 border-t border-accent/30 animate-pulse">
                        <td colSpan={2} className="p-6 md:p-8 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-accent">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
                            </div>
                            <span className="text-sm font-semibold text-accent">AI is actively translating the next section...</span>
                            <span className="text-xs text-muted-foreground">Live streaming in progress</span>
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
                  <div key={idx} className="relative overflow-hidden bg-card/50 border border-border rounded-3xl p-6 md:p-8 hover:border-accent/40 transition-all duration-500  shadow-2xl backdrop-blur-xl group animate-fadeIn">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative group/english">
                      <div className="absolute inset-0 bg-accent/10 blur-2xl opacity-0 group-hover/english:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="text-reading leading-loose text-base md:text-lg font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold">
                        <ReactMarkdown>{row.transcreatedText}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live Streaming Dots Indicator for English Only */}
                {aiIsTranslating && (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl bg-card/50 border border-accent/30 text-accent backdrop-blur-xl animate-pulse text-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" />
                    </div>
                    <span className="text-sm font-semibold text-accent">AI is actively translating the next section...</span>
                    <span className="text-xs text-muted-foreground">Live streaming in progress</span>
                  </div>
                )}
              </div>
            )}

            {/* Truncation Action CTA Card */}
            {aiUntranslatedText && (
              <div className="flex flex-col items-center gap-4 p-6 md:p-8 bg-accent/10 border-2 border-accent/40 rounded-3xl backdrop-blur-xl  animate-fadeIn text-center mt-4">
                <div className="flex items-center gap-2 text-accent font-bold text-base md:text-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Partial Translation Complete</span>
                </div>
                <p className="text-xs md:text-sm text-reading max-w-xl leading-relaxed">
                  Your input text was long, so we translated the first section. Click below to continue seamlessly from where it left off!
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
                  <button
                    onClick={() => {
                      triggerAiTranslation(aiUntranslatedText, true);
                    }}
                    disabled={aiIsTranslating}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-accent-foreground font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer w-full sm:w-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Continue Translating the Rest</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiUntranslatedText);
                      toast.success("Remaining untranslated portion copied to clipboard!");
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-card/90 hover:bg-muted text-reading font-semibold text-xs sm:text-sm rounded-2xl border border-border transition-all cursor-pointer w-full sm:w-auto"
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
