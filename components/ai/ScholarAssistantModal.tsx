'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  X,
  Languages,
  CheckCircle2,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  Crown,
} from 'lucide-react';
import { useSubscriptionStore } from '@/lib/stores/subscriptionStore';
import { toast } from 'sonner';

interface SourceCitation {
  id: string;
  workTitle: string;
  authorName: string;
  language: string;
  surahId: number | null;
  ayahId: number | null;
  rootWord: string | null;
  snippet: string;
  score: number;
}

interface ScholarlyAnswer {
  query: string;
  answerMarkdown: string;
  sources: SourceCitation[];
}

export function ScholarAssistantModal({
  isOpen,
  onClose,
  initialQuery = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const { tier, openPricingModal, dailyQueriesUsed, dailyQueriesLimit, incrementDailyQueries } = useSubscriptionStore();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScholarlyAnswer | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);

  if (!isOpen) return null;

  const handleAsk = async (question?: string) => {
    const qToAsk = question || query;
    if (!qToAsk.trim()) return;

    /* Temporarily commented out until payment gateway approval:
    if (tier === "FREE" && dailyQueriesUsed >= dailyQueriesLimit) {
      toast.error("Daily AI Quota Reached (5/5)", {
        description: "You have used all 5 free research questions for today. Upgrade to Pro for 50 queries/day or use code BARAKAH!",
        duration: 6000,
      });
      openPricingModal();
      return;
    }
    */

    setLoading(true);
    setResult(null);
    setSelectedSource(null);

    try {
      const res = await fetch('/api/ai/scholar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: qToAsk }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert(data.error || 'Failed to get scholarly answer.');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching scholarly answer.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    'What do scholars say about patience and prayer in Surah 2 Ayah 45?',
    'What is the lexical meaning of the root صبر in Lane Lexicon?',
    'Explain the tadabbur and praise of Allah in Surah 1 verse 2 according to Ibn Kathir',
    'What did Al-Jalalayn say regarding steadfastness and reliance on God?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[88vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Academic AI Scholar
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-normal">
                  Graph-RAG & Multi-Lingual
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                100+ Classical Tafsirs & Lexicons • Exact Citations • Zero Hallucination Guardrails
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {/* <button
              onClick={openPricingModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="View Research Plans"
            >
              <Crown className="size-3.5 text-emerald-400" />
              <span className="uppercase">{tier}</span>
            </button> */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Answer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Input Bar */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/40">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Ask a scholarly question (e.g. 'What did Ibn Kathir say about Surah 2:45?')"
                  className="w-full pl-4 pr-28 py-3 bg-neutral-900 border border-neutral-700/80 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition text-sm"
                />
                <button
                  onClick={() => handleAsk()}
                  disabled={loading || !query.trim()}
                  className="absolute right-2 flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium text-xs rounded-lg transition"
                >
                  {loading ? 'Researching...' : 'Research'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sample Questions Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-neutral-500">Suggestions:</span>
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(q);
                      handleAsk(q);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/50 transition truncate max-w-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Display Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">Searching Classical Tafsir & Lexicon Database...</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Performing BM25 + Vector Hybrid Retrieval across Ibn Kathir, Jalalayn, and Lane's Lexicon
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  {/* Verified Scholarly Badge */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      Synthesized from <strong>{result.sources.length} Classical Parent Blocks</strong> with full text integrity. Click any citation badge below to view original text.
                    </span>
                  </div>

                  {/* Markdown Answer Output */}
                  <div className="prose prose-invert max-w-none text-sm text-neutral-200 space-y-4">
                    {result.answerMarkdown.split('\n').map((line, idx) => {
                      const cleanLine = line
                        .replace(/\*\*(.*?)\*\*/g, '$1')
                        .replace(/\*(.*?)\*/g, '$1')
                        .replace(/`(.*?)`/g, '$1');

                      if (line.startsWith('## ')) {
                        return (
                          <h2 key={idx} className="text-lg font-bold text-white border-b border-neutral-800 pb-2">
                            {cleanLine.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (line.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-base font-semibold text-emerald-400 mt-4">
                            {cleanLine.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('#### ')) {
                        return (
                          <h4 key={idx} className="text-sm font-semibold text-amber-300 mt-3">
                            {cleanLine.replace('#### ', '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('> ')) {
                        return (
                          <blockquote
                            key={idx}
                            className="p-3 my-2 border-l-4 border-emerald-500 bg-neutral-900/60 rounded-r-lg text-neutral-300 text-xs italic"
                          >
                            {cleanLine.replace('> ', '')}
                          </blockquote>
                        );
                      }
                      return (
                        <p key={idx} className="leading-relaxed">
                          {cleanLine}
                        </p>
                      );
                    })}
                  </div>

                  {/* Clickable Citations Bar */}
                  <div className="pt-6 border-t border-neutral-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      Retrieved Classical Sources ({result.sources.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.sources.map((src, idx) => (
                        <button
                          key={src.id}
                          onClick={() => setSelectedSource(src)}
                          className={`flex items-start justify-between p-3 rounded-xl border text-left transition ${
                            selectedSource?.id === src.id
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                              : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                              {src.workTitle}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 uppercase">
                                {src.language}
                              </span>
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {src.surahId && src.ayahId
                                ? `Surah ${src.surahId}:${src.ayahId}`
                                : src.rootWord
                                ? `Root: ${src.rootWord}`
                                : 'Classical Entry'}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-amber-500/10 border border-neutral-800 flex items-center justify-center mb-4">
                    <BookOpen className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Ask Any Quranic or Lexical Question</h3>
                  <p className="text-xs text-neutral-400 max-w-md mt-1.5">
                    Our Graph-RAG engine searches full classical Parent Blocks across English & Arabic Tafsirs and Lexicons to provide academic answers with verifiable citations.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Side Drawer for Full Classical Source Text */}
          {selectedSource && (
            <div className="w-full md:w-96 border-l border-neutral-800 bg-neutral-900/80 flex flex-col h-full animate-slideLeft">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedSource.workTitle}</h4>
                  <p className="text-xs text-amber-400">
                    {selectedSource.authorName} • Language: {selectedSource.language.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {selectedSource.surahId && selectedSource.ayahId
                      ? `Surah ${selectedSource.surahId}, Ayah ${selectedSource.ayahId}`
                      : selectedSource.rootWord
                      ? `Lexicon Root: ${selectedSource.rootWord}`
                      : 'Source Reference'}
                  </span>
                  <span className="ml-auto text-emerald-400 font-mono text-[11px]">
                    Score: {selectedSource.score.toFixed(4)}
                  </span>
                </div>

                <div
                  className={`p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs leading-relaxed text-neutral-200 ${
                    selectedSource.language === 'ar' ? 'font-arabic text-right text-base leading-loose' : ''
                  }`}
                  dir={selectedSource.language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {selectedSource.snippet
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
