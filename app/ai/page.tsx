'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Languages, Loader2, ArrowRightLeft, ShieldAlert, Copy, Check, LayoutGrid, Columns, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import LogoIcon from '@/components/svg/icons/LogoIcon';
import { toast } from 'sonner';

export default function AiTranslatorPage() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get('text') || '';
  
  const [inputText, setInputText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [translationData, setTranslationData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const sessionText = sessionStorage.getItem('ai_translator_input');
    if (sessionText) {
      setInputText(sessionText);
      handleTranslate(sessionText);
      sessionStorage.removeItem('ai_translator_input');
    } else if (initialText) {
      handleTranslate(initialText);
    }
  }, [initialText]);

  const handleTranslate = async (textToTranslate = inputText) => {
    if (!textToTranslate.trim()) return;
    
    setLoading(true);
    setError(null);
    setTranslationData(null);

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToTranslate }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Translation failed');
      }

      setTranslationData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySegment = (text: string, index: number) => {
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

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/80 px-4 md:px-8 py-3">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo and App Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <LogoIcon className="w-8 h-8 rounded-[20%] hidden md:block" />
              <span className="font-bold text-xl tracking-tight text-white hidden md:block">Al-Juthur</span>
            </Link>
          </div>

          {/* Desktop Full Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-zinc-400 text-sm">
            <Link href="/" className="cursor-pointer hover:text-gray-300 transition text-zinc-400">
              Home
            </Link>
            <Link href="/surah/1" className="cursor-pointer hover:text-gray-300 transition">
              Read Quran
            </Link>
            <Link href="/tafsir" className="cursor-pointer hover:text-gray-300 transition">
              Tafsir
            </Link>
            <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition">
              Lexicon
            </Link>
            <Link href="/ai" className="cursor-pointer text-white font-medium">
              Translator AI
            </Link>
          </nav>
        </div>
      </div>

      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full gap-6">
        
        {/* Header Title inside Page */}
        <div className="flex flex-col gap-1 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Languages className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Smart Translation Assistant</h1>
              <p className="text-sm text-neutral-400">Translate classical Arabic Tafsir and text into clean English</p>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-end">
             <label className="text-sm font-semibold text-neutral-300">Input Source Text (Arabic)</label>
             <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
               <ShieldAlert className="w-3.5 h-3.5" />
               Translation Only
             </div>
          </div>
          <textarea
            className="w-full h-40 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 resize-none font-serif text-lg leading-loose"
            dir="auto"
            placeholder="Paste classical Arabic Tafsir, Lexicon text, or Hadith here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            onClick={() => handleTranslate()}
            disabled={loading || !inputText.trim()}
            className="self-end flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-950/20 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
            {loading ? 'Translating securely...' : 'Translate to English'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading Animation */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 animate-pulse">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 border-4 border-emerald-400/40 rounded-full animate-spin"></div>
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-medium text-emerald-400">Analyzing Classical Text...</p>
              <p className="text-sm text-neutral-500">Connecting to translation engine, please wait a moment</p>
            </div>
          </div>
        )}

        {/* Empty State CTA */}
        {!translationData && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center mt-4 bg-neutral-900/50 rounded-2xl border border-neutral-800/60">
            <BookOpen className="w-12 h-12 text-emerald-500/50 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Need Arabic text to translate?</h3>
            <p className="text-neutral-400 mb-8 max-w-md">
              You can easily copy classical texts directly from our Lexicon or Tafsir sections to translate them instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link href="/tafsir" className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition border border-neutral-700">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Go to Classic Arabic Tafsir
              </Link>
              <Link href="/lexicon" className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition border border-neutral-700">
                <Languages className="w-4 h-4 text-emerald-400" />
                Go to Classic Lexicon
              </Link>
            </div>
          </div>
        )}

        {/* Output Section */}
        {translationData && translationData.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h2 className="text-lg font-bold text-white">Translation Result</h2>
              
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

            {/* Rendering: Reader Mode (Cards) */}
            {viewMode === 'cards' ? (
              <div className="flex flex-col gap-6">
                {translationData.map((row, idx) => (
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
                      <button
                        onClick={() => copySegment(row.transcreatedText, idx)}
                        className="self-start flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition text-xs font-medium text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>
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
                    {translationData.map((row, idx) => (
                      <tr key={idx} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/20 transition">
                        <td className="p-5 align-top text-sm leading-relaxed text-neutral-300 border-r border-neutral-800">
                          {row.transcreatedText}
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
