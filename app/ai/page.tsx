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

  const copyAll = (format: 'english' | 'reader' | 'original') => {
    if (!aiTranslationData) return;
    let textToCopy = '';
    
    if (format === 'english') {
      textToCopy = aiTranslationData.map(row => row.transcreatedText).join('\n\n');
    } else if (format === 'reader') {
      textToCopy = aiTranslationData.map(row => `${row.sourceText}\n\n${row.transcreatedText}`).join('\n\n---\n\n');
    } else if (format === 'original') {
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
        {aiIsTranslating && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 animate-pulse">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-4 border-emerald-400/40 rounded-full animate-spin"></div>
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-neutral-500 max-w-md text-center">
                It may take a few seconds to achieve an accurate, word-for-word scholarly translation. Feel free to explore other features in the app in the meantime—we will notify you the moment it is done!
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
              <h2 className="text-lg font-bold text-white">Translation Result</h2>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Global Copy Actions */}
                <div className="flex items-center gap-1.5 bg-neutral-900/50 rounded-lg p-1 border border-neutral-800">
                  <span className="text-xs font-medium text-neutral-500 px-2">Copy All:</span>
                  <button
                    onClick={() => copyAll('english')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800"
                    title="Copy English Only"
                  >
                    {copiedIndex === 'all-english' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>English</span>
                  </button>
                  <button
                    onClick={() => copyAll('reader')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800"
                    title="Copy Reader Mode Format"
                  >
                    {copiedIndex === 'all-reader' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Reader</span>
                  </button>
                  <button
                    onClick={() => copyAll('original')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800"
                    title="Copy Original Mode Format"
                  >
                    {copiedIndex === 'all-original' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Original</span>
                  </button>
                </div>

                {/* Layout Toggles */}
                <div className="flex items-center bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      viewMode === 'cards' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Reader Mode</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      viewMode === 'table' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Table view"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Classic Split</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rendering: Reader Mode (Cards) */}
            {viewMode === 'cards' ? (
              <div className="flex flex-col gap-6">
                {aiTranslationData.map((row, idx) => (
                  <div key={idx} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 md:p-6 hover:border-neutral-700/80 transition space-y-4 shadow-xl animate-fadeIn">
                    {/* Arabic Box */}
                    <div className="border-r-4 border-emerald-500/40 pr-4 text-right" dir="rtl">
                      <p className="font-serif text-xl leading-loose text-emerald-100 tracking-wide">
                        {row.sourceText}
                      </p>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-neutral-800/80 w-full" />
                    {/* English Box */}
                    <div className="flex flex-col gap-3">
                      <p className="text-neutral-300 leading-relaxed text-sm md:text-base font-sans">
                        {row.transcreatedText}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          onClick={() => copySegment(row.transcreatedText, `${idx}-eng`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {copiedIndex === `${idx}-eng` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>English Only</span>
                        </button>
                        <button
                          onClick={() => copySegment(`${row.sourceText}\n\n${row.transcreatedText}`, `${idx}-reader`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {copiedIndex === `${idx}-reader` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Reader Mode</span>
                        </button>
                        <button
                          onClick={() => copySegment(`${row.transcreatedText}\n\n${row.sourceText}`, `${idx}-original`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {copiedIndex === `${idx}-original` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Original Mode</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Rendering: Classic Split (Table) */
              <div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-800/80">
                      <th className="p-4 border-b border-neutral-700 font-bold text-sm text-neutral-200 w-1/2 border-r">Transcreated Text</th>
                      <th className="p-4 border-b border-neutral-700 font-bold text-sm text-neutral-200 w-1/2 text-right">Source Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiTranslationData.map((row, idx) => (
                      <tr key={idx} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/20 transition">
                        <td className="p-5 align-top text-sm leading-relaxed text-neutral-300 border-r border-neutral-800">
                          <div className="mb-4">
                            {row.transcreatedText}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-800/50">
                            <button
                              onClick={() => copySegment(row.transcreatedText, `${idx}-eng-table`)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/50 hover:bg-neutral-700 transition text-[11px] font-medium text-neutral-400 hover:text-white cursor-pointer"
                            >
                              {copiedIndex === `${idx}-eng-table` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>English Only</span>
                            </button>
                            <button
                              onClick={() => copySegment(`${row.sourceText}\n\n${row.transcreatedText}`, `${idx}-reader-table`)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/50 hover:bg-neutral-700 transition text-[11px] font-medium text-neutral-400 hover:text-white cursor-pointer"
                            >
                              {copiedIndex === `${idx}-reader-table` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Reader Mode</span>
                            </button>
                            <button
                              onClick={() => copySegment(`${row.transcreatedText}\n\n${row.sourceText}`, `${idx}-original-table`)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/50 hover:bg-neutral-700 transition text-[11px] font-medium text-neutral-400 hover:text-white cursor-pointer"
                            >
                              {copiedIndex === `${idx}-original-table` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>Original Mode</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-5 align-top font-serif text-lg leading-loose text-emerald-100 text-right" dir="rtl">
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
