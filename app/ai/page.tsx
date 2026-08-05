'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Languages, Loader2, ArrowRightLeft, ShieldAlert, Copy, Check, LayoutGrid, Columns, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import LogoIcon from '@/components/svg/icons/LogoIcon';
import { toast } from 'sonner';
import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';

export default function AiTranslatorPage() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get('text') || '';
  
  const {
    aiInputText,
    setAiInputText,
    aiTranslationData,
    aiIsTranslating,
    aiError,
    triggerAiTranslation,
    clearAiTranslation,
  } = useGlobalState();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);

  useEffect(() => {
    // Fetch remaining tokens on mount
    fetch('/api/ai/translate')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRemainingTokens(data.remaining);
          if (data.limit) setTokenLimit(data.limit);
        }
      })
      .catch(console.error);

    const sessionText = sessionStorage.getItem('ai_translator_input');
    if (sessionText) {
      triggerAiTranslation(sessionText);
      sessionStorage.removeItem('ai_translator_input');
    } else if (initialText && initialText !== aiInputText) {
      triggerAiTranslation(initialText);
    }
  }, [initialText]);

  const copySegment = (text: string, index: string) => {
    // Fallback for mobile and http contexts
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopiedIndex(index);
    toast("Copied translation segment!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const copyAll = (format: 'english' | 'reader' | 'split') => {
    if (!aiTranslationData) return;
    let textToCopy = '';
    
    if (format === 'english') {
      textToCopy = aiTranslationData.map(row => row.transcreatedText).join('\n\n');
    } else if (format === 'reader') {
      textToCopy = aiTranslationData.map(row => `${row.sourceText}\n\n${row.transcreatedText}`).join('\n\n---\n\n');
    } else if (format === 'split') {
      textToCopy = aiTranslationData.map(row => `${row.transcreatedText}\n\n${row.sourceText}`).join('\n\n---\n\n');
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
    setCopiedIndex(`all-${format}`);
    toast(`Copied all translations in ${format} format!`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col pb-10">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-zinc-950/40 border-b border-zinc-800/80 px-4 md:px-8 py-3">
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
              AI Translator
            </Link>
            <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              RAG Bot
            </Link>
          </nav>
        </div>
      </div>

      <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full gap-6">
        
        {/* Header section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Translation Engine
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Classical Arabic <span className="text-emerald-400">AI Translator</span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg">
              Paste classical Arabic Tafsir, Lexicon passages, or ancient Islamic texts to translate them instantly into clear, highly accurate English.
            </p>
          </div>
        </div>
        
        {/* Token limit */}
        {remainingTokens !== null && (
          <div className="max-w-2xl mx-auto w-full flex items-center justify-center -mt-2 mb-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                <strong>{remainingTokens.toLocaleString()}</strong> / {tokenLimit.toLocaleString()} Daily Tokens Remaining
              </span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-end">
             <label className="text-sm font-semibold text-neutral-300">Input Source Text (Arabic)</label>
             <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
               <ShieldAlert className="w-3.5 h-3.5" />
               Translation Only
             </div>
          </div>
          <textarea
            className="w-full h-40 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-xl transition-all resize-none font-serif text-lg leading-loose"
            dir="auto"
            placeholder="Paste classical Arabic Tafsir, Lexicon text, or Hadith here..."
            value={aiInputText}
            onChange={(e) => setAiInputText(e.target.value)}
          />
          <div className="flex justify-end items-center gap-3 w-full">
            <button
              onClick={() => clearAiTranslation()}
              disabled={aiIsTranslating || (!aiInputText.trim() && !aiTranslationData)}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 text-neutral-300 font-bold rounded-xl transition cursor-pointer border border-neutral-700"
            >
              Clear
            </button>
            <button
              onClick={() => triggerAiTranslation(aiInputText)}
              disabled={aiIsTranslating || !aiInputText.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/20 cursor-pointer"
            >
              {aiIsTranslating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
              {aiIsTranslating ? 'Translating securely...' : 'Translate to English'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {aiError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {aiError}
          </div>
        )}

        {/* Loading Animation */}
        {aiIsTranslating && (!aiTranslationData || aiTranslationData.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 animate-pulse">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-4 border-emerald-400/40 rounded-full animate-spin"></div>
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-neutral-500 max-w-md text-center">
                Translating classical text...
              </p>
            </div>
          </div>
        )}

        {/* Empty State CTA */}
        {!aiTranslationData && !aiIsTranslating && !aiError && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center mt-4 bg-slate-900/30 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
            <BookOpen className="w-12 h-12 text-emerald-500/60 mb-5" />
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Need Arabic text to translate?</h3>
            <p className="text-slate-400 mb-8 max-w-md text-base">
              You can easily copy classical texts directly from our Lexicon or Tafsir sections to translate them instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link href="/tafsir" className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold rounded-xl transition-all border border-emerald-500/20 hover:border-emerald-500/40">
                <BookOpen className="w-4 h-4" />
                Go to Classical Tafsir
              </Link>
              <Link href="/lexicon" className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all border border-slate-600 hover:border-slate-500">
                <Languages className="w-4 h-4 text-emerald-400" />
                Go to Classic Lexicon
              </Link>
            </div>
          </div>
        )}

        {/* Output Section */}
        {aiTranslationData && aiTranslationData.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-3 gap-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                Translation Result
                {aiIsTranslating && (
                  <span className="flex h-3 w-3 relative ml-3" title="Streaming...">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </h2>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Global Copy Actions */}
                <div className="flex items-center p-1.5 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner backdrop-blur-md">
                  <span className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-widest hidden sm:block">Copy</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyAll('english')}
                      className="group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] text-slate-300"
                      title="Copy English Only"
                    >
                      {copiedIndex === 'all-english' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />}
                      <span>English</span>
                    </button>
                    <button
                      onClick={() => copyAll('reader')}
                      className="group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] text-slate-300"
                      title="Copy Reader Mode Format"
                    >
                      {copiedIndex === 'all-reader' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />}
                      <span>Reader</span>
                    </button>
                    <button
                      onClick={() => copyAll('split')}
                      className="group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] text-slate-300"
                      title="Copy Split Mode Format"
                    >
                      {copiedIndex === 'all-split' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />}
                      <span>Split</span>
                    </button>
                  </div>
                </div>

                {/* Layout Toggles */}
                <div className="flex items-center p-1.5 rounded-xl bg-slate-900/60 border border-slate-700/50 shadow-inner backdrop-blur-md">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'cards' ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Reader</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title="Table view"
                  >
                    <Columns className="w-4 h-4" />
                    <span>Classic</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rendering: Reader Mode (Cards) */}
            {viewMode === 'cards' ? (
              <div className="flex flex-col gap-8 pb-10">
                {aiTranslationData.map((row, idx) => (
                  <div key={idx} className="relative overflow-hidden bg-slate-900/40 border border-slate-700/50 rounded-3xl p-6 md:p-10 hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.06)] space-y-8 shadow-2xl backdrop-blur-xl group animate-fadeIn">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {/* Arabic Box */}
                    <div className="relative border-r-4 border-emerald-500/50 pr-6 md:pr-8 text-right" dir="rtl">
                      <p className="font-serif text-2xl md:text-3xl leading-relaxed text-emerald-50 tracking-wide">
                        {row.sourceText}
                      </p>
                    </div>
                    {/* Divider */}
                    <div className="relative h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent w-full" />
                    {/* English Box */}
                    <div className="relative pl-2 md:pl-4">
                      <p className="text-slate-300 leading-loose text-base md:text-lg font-sans">
                        {row.transcreatedText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Rendering: Classic Split (Table) */
              <div className="w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-xl shadow-2xl mb-10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-700/50">
                      <th className="p-6 font-bold text-xs text-slate-300 w-1/2 border-r border-slate-700/50 uppercase tracking-widest">English Translation</th>
                      <th className="p-6 font-bold text-xs text-emerald-400 w-1/2 text-right uppercase tracking-widest">Original Arabic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {aiTranslationData.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-800/30 transition-colors duration-300">
                        <td className="p-6 md:p-8 align-top text-base leading-relaxed text-slate-300 border-r border-slate-700/50 relative">
                          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/0 group-hover:bg-emerald-500/40 transition-colors duration-300" />
                          {row.transcreatedText}
                        </td>
                        <td className="p-6 md:p-8 align-top font-serif text-xl md:text-2xl leading-loose text-emerald-50 text-right" dir="rtl">
                          {row.sourceText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
          </div>
        )}

      </main>
    </div>
  );
}
