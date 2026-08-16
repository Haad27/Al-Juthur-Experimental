'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, ArrowRight, BookOpen, Loader2, Bot } from 'lucide-react';

import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import { useAudioStore } from '@/lib/stores/audioStore';
import { toast } from 'sonner';
import LexiconTextRenderer from '@/components/lexicon/LexiconTextRenderer';

interface InteractiveAyahWordsProps {
  surahNumber: number;
  ayahNumber: number;
  ayahText: string;
  ayahWords?: { wordIndex: number; word: string }[];
  wbwTranslation?: Record<string, string>;
  showWbw?: boolean;
}

interface WordMorphologyData {
  morphology: {
    surah: number;
    ayah: number;
    wordIndex: number;
    word: string;
    root: string | null;
    lemma: string | null;
    stem: string | null;
    irab?: string | null;
  };
  rootSummary: string | null;
  rootQuery: string | null;
  aiSummary?: {
    root_meaning_html: string;
    quranic_usage_html: string;
  } | null;
}
const formatArabicWithIndoPak = (html: string) => {
  if (!html) return '';
  return html.replace(
    /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
    '<span class="font-mushaf-indopak-16 text-sm sm:text-base leading-normal text-emerald-200 inline-block mx-1" dir="rtl">$&</span>'
  );
};

export const InteractiveAyahWords: React.FC<InteractiveAyahWordsProps> = React.memo(({
  surahNumber,
  ayahNumber,
  ayahText,
  ayahWords,
  wbwTranslation,
  showWbw = true,
}) => {
  const { mushafStyle, wbwFontSize = 3, setIsWordDialogVisible } = useGlobalState();
  const isPlaying = useAudioStore((state) => state.isPlaying);

  const mushafFontClass = React.useMemo(() => {
    switch (mushafStyle) {
      case "v1":              return "font-mushaf-v1";
      case "v2":              return "font-mushaf-v2";
      case "uthmani-simple":  return "font-mushaf-uthmani-simple";
      case "kfqpc":           return "font-mushaf-kfqpc";
      case "indopak":         return "font-mushaf-indopak";
      case "indopak-15":      return "font-mushaf-indopak-15";
      case "indopak-16":      return "font-mushaf-indopak-16";
      case "naskh":           return "font-mushaf-naskh";
      case "warsh":           return "font-mushaf-warsh";
      case "uthmani":         return "font-mushaf-v2";
      case "amiri":           return "font-mushaf-warsh";
      default:                return "font-mushaf-v2";
    }
  }, [mushafStyle]);


  const tokens = React.useMemo(() => {
    const rawTokens = ayahText.trim().split(/\s+/);
    let currentWordIdx = 1;
    return rawTokens.map((w) => {
      // Check if token is purely a pause symbol, punctuation, or Arabic numeral
      const isPauseOrNumber = /^[\u06D6-\u06ED\u06D4\u06E9\u0660-\u0669\u06F0-\u06F9]+$/.test(w) ||
        ['ۗ', 'ۛ', 'ۖ', 'ۚ', 'ۙ', '۩', 'ۜ', 'ۘ', '۞', '۩'].includes(w);

      if (isPauseOrNumber) {
        return { wordIndex: null, word: w, isClickable: false };
      } else {
        const idx = ayahWords && ayahWords[currentWordIdx - 1] 
          ? ayahWords[currentWordIdx - 1].wordIndex 
          : currentWordIdx;
        currentWordIdx++;
        return { wordIndex: idx, word: w, isClickable: true };
      }
    });
  }, [ayahText, ayahWords]);

  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [wordDataMap, setWordDataMap] = useState<Record<number, WordMorphologyData>>({});

  const handleWordClick = async (wordIndex: number) => {
    if (useAudioStore.getState().isPlaying) {
      toast.info("Please pause the recitation to interact with words.", { id: 'pause-recitation' });
      return;
    }
    if (wordDataMap[wordIndex]) return; // already loaded
    setLoadingIndex(wordIndex);
    try {
      const res = await fetch(
        `/api/lexicon/word?surah=${surahNumber}&ayah=${ayahNumber}&wordIndex=${wordIndex}`
      );
      if (res.ok) {
        const data = await res.json();
        setWordDataMap((prev) => ({ ...prev, [wordIndex]: data }));
      }
    } catch (err) {
      console.error('Failed to load word morphology:', err);
    } finally {
      setLoadingIndex(null);
    }
  };

  React.useEffect(() => {
    const unsubscribe = useAudioStore.subscribe((state, prevState) => {
       const isPlaying = state.isPlaying;
       const currentAyah = state.currentAyah;
       const currentWord = state.currentWord;

       if (currentAyah !== ayahNumber) {
          if (prevState.currentAyah === ayahNumber) {
             tokens.forEach(t => {
               if (t.wordIndex !== null) {
                 document.getElementById(`word-${ayahNumber}-${t.wordIndex}`)?.classList.remove('!text-emerald-400', 'scale-110');
                 document.getElementById(`meaning-${ayahNumber}-${t.wordIndex}`)?.classList.remove('!text-emerald-400', 'font-semibold');
               }
             });
             const ayahTextEl = document.getElementById(`atext-${ayahNumber}`);
             ayahTextEl?.classList.remove('!text-emerald-400');
          }
          return;
       }

       if (isPlaying) {
         if (currentWord !== null) {
           // Word-by-word highlighting
           tokens.forEach(t => {
             const el = document.getElementById(`word-${ayahNumber}-${t.wordIndex}`);
             if (!el) return;
             if (t.wordIndex === currentWord) {
               el.classList.add('!text-emerald-400', 'scale-110');
               document.getElementById(`meaning-${ayahNumber}-${t.wordIndex}`)?.classList.add('!text-emerald-400', 'font-semibold');
             } else {
               el.classList.remove('!text-emerald-400', 'scale-110');
               document.getElementById(`meaning-${ayahNumber}-${t.wordIndex}`)?.classList.remove('!text-emerald-400', 'font-semibold');
             }
           });
         } else {
           // Ayah-by-ayah highlighting fallback (if segments not available)
            tokens.forEach(t => {
             if (t.wordIndex !== null) {
               document.getElementById(`word-${ayahNumber}-${t.wordIndex}`)?.classList.add('!text-emerald-400');
               document.getElementById(`meaning-${ayahNumber}-${t.wordIndex}`)?.classList.add('!text-emerald-400');
             }
           });
           const ayahTextEl = document.getElementById(`atext-${ayahNumber}`);
           ayahTextEl?.classList.add('!text-emerald-400');
         }
       } else {
          tokens.forEach(t => {
             if (t.wordIndex !== null) {
               document.getElementById(`word-${ayahNumber}-${t.wordIndex}`)?.classList.remove('!text-emerald-400', 'scale-110');
               document.getElementById(`meaning-${ayahNumber}-${t.wordIndex}`)?.classList.remove('!text-emerald-400', 'font-semibold');
             }
          });
          const ayahTextEl = document.getElementById(`atext-${ayahNumber}`);
          ayahTextEl?.classList.remove('!text-emerald-400');
       }
    });

    return unsubscribe;
  }, [ayahNumber, tokens]);

  return (
    <span className="inline-flex flex-wrap gap-x-2.5 gap-y-2 leading-relaxed" dir="rtl">
      {tokens.map((item, idx) => {
        const { wordIndex: wordIdx, word, isClickable } = item;

        if (!isClickable || wordIdx === null) {
          return (
            <span key={idx} className="inline-flex flex-col items-center justify-end px-1 py-0.5 text-zinc-400 select-none min-w-[2rem]">
              <span>{word}</span>
              {showWbw && (
                <span 
                  className="mt-0.5 block opacity-0 pointer-events-none select-none"
                  style={{ fontSize: `${0.5 + (wbwFontSize * 0.1)}rem` }}
                >
                  -
                </span>
              )}
            </span>
          );
        }

        const data = wordDataMap[wordIdx];
        const meaning = wbwTranslation?.[`${ayahNumber}:${wordIdx}`];

        // The Uthmanic Hafs V18 font has a known OpenType bug where Sifr marks (U+06DF, U+06E0)
        // and small meem marks (U+06D2, U+06E2, U+06ED) fail to combine with their base letters, 
        // rendering an ugly dotted circle or mixing with the word.
        // To fix this without losing the small circle/meem, we wrap the base letter and the mark
        // in IndoPak 15-line font (which has a straight Alif matching Uthmani) which renders it flawlessly.
        // We override line-height to 1 to prevent it from elevating the flex item.
        let displayWord = word;
        if (mushafFontClass.includes('v1') || mushafFontClass.includes('v2') || mushafFontClass.includes('uthmani') || mushafFontClass.includes('kfqpc')) {
          displayWord = word.replace(/(\S)([\u06DF\u06E0\u06D2\u06E2\u06ED])/g, '<span class="font-mushaf-indopak-15" style="line-height: 1 !important; display: inline-block;">$1$2</span>');
        }

        return (
          <Dialog key={idx} onOpenChange={(open) => { 
            if (open) handleWordClick(wordIdx);
            setIsWordDialogVisible(open);
          }}>
            <DialogTrigger asChild>
              <span
                className="group inline-flex flex-col items-center justify-end cursor-pointer px-1 py-0.5 rounded-lg hover:bg-emerald-500/30 transition-colors duration-150 select-none min-w-[2.5rem]"
                onClick={(e) => {
                  if (useAudioStore.getState().isPlaying) {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.info("Please pause the recitation to interact with words.", { id: 'pause-recitation' });
                  }
                }}
              >
                <span 
                  id={`word-${ayahNumber}-${wordIdx}`} 
                  className={`text-white group-hover:text-emerald-300 ${mushafFontClass} transition-all duration-150`}
                  dangerouslySetInnerHTML={{ __html: displayWord }}
                />
                {showWbw && meaning && (
                  <span 
                    id={`meaning-${ayahNumber}-${wordIdx}`} 
                    className="text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-200 font-sans tracking-tight mt-0.5 block whitespace-nowrap text-center select-none transition-colors duration-150" 
                    dir="ltr"
                    style={{ fontSize: `${0.5 + (wbwFontSize * 0.1)}rem` }}
                  >
                    {meaning}
                  </span>
                )}
              </span>
            </DialogTrigger>
            <DialogContent
              className="max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden bg-slate-950 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-2xl flex flex-col custom-scrollbar z-[100]"
            >
              <DialogHeader className="sr-only">
                <DialogTitle>Root Word Analysis</DialogTitle>
              </DialogHeader>
              {loadingIndex === wordIdx && !data ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-sm">Analyzing root & morphology...</span>
                </div>
              ) : data ? (
                <div className="space-y-3.5">
                  {/* Header: Clicked Word + Location */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 pr-8">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      {surahNumber}:{ayahNumber}:{wordIdx}
                    </span>
                    <span className="font-arabic text-2xl font-bold text-white">
                      {word}
                    </span>
                  </div>

                  {/* Morphology details */}
                  {(() => {
                    const isMuqattaat = Boolean(
                      (data as any).isMuqattaat ||
                      !data.morphology.root ||
                      data.morphology.root === 'None' ||
                      data.morphology.stem?.toLowerCase().includes('quranic initials') ||
                      data.morphology.stem?.includes('مقطعة') ||
                      data.morphology.root?.toLowerCase().includes('quranic initials')
                    );

                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">Root Word</span>
                            <span className={`text-base font-bold text-emerald-300 ${isMuqattaat ? 'font-sans text-sm' : 'font-arabic'}`}>
                              {isMuqattaat ? 'None' : (data.morphology.root || 'N/A')}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                            <span className="text-slate-400 block mb-0.5">Sarf (Morphology)</span>
                            <span className="font-arabic text-xs font-medium text-white leading-relaxed line-clamp-3">
                              {isMuqattaat ? 'Quranic Initials (حروف مقطعة)' : (data.morphology.stem || 'N/A')}
                            </span>
                          </div>
                        </div>

                        {data.morphology.irab && !isMuqattaat && (
                          <div className="text-xs text-slate-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/50 leading-relaxed font-arabic text-right dir-rtl">
                            <strong className="text-emerald-400 font-semibold block mb-1 font-sans text-left dir-ltr">
                              I'rab (Grammar):
                            </strong>
                            {data.morphology.irab}
                          </div>
                        )}

                        {/* If Huroof-e-Muqatta'at, show scholarly notice instead of Root Meaning / Quranic Usage */}
                        {isMuqattaat ? (
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm text-center leading-relaxed space-y-2">
                            <p className="font-bold text-amber-200 text-sm font-arabic">
                              حروف مقطعة — Huroof-e-Muqatta&apos;at (Quranic Initials)
                            </p>
                            <p className="text-zinc-300 text-xs leading-relaxed">
                              These disjointed letters appear at the opening of certain Surahs. Classical scholarship establishes that they do not possess an etymological root word, and their true reality and ultimate meaning reside exclusively with Allah ﷻ.
                            </p>
                          </div>
                        ) : data.aiSummary ? (
                          <div className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 leading-relaxed space-y-3">
                            <div>
                              <strong className="text-emerald-400 font-semibold block mb-1">
                                Root Meaning:
                              </strong>
                              <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-slate-200 prose-em:text-slate-400" dangerouslySetInnerHTML={{ __html: formatArabicWithIndoPak(data.aiSummary.root_meaning_html) }} />
                            </div>
                            <div className="border-t border-slate-700/50 pt-2">
                              <strong className="text-amber-400 font-semibold block mb-1">
                                Quranic Usage:
                              </strong>
                              <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-slate-200 prose-em:text-slate-400" dangerouslySetInnerHTML={{ __html: formatArabicWithIndoPak(data.aiSummary.quranic_usage_html) }} />
                            </div>
                          </div>
                        ) : data.rootSummary ? (
                          <div className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                            <strong className="text-emerald-400 font-semibold block mb-1">
                              Lane&apos;s Lexicon Summary:
                            </strong>
                            {data.rootSummary}
                          </div>
                        ) : null}

                        {/* Deep Lexicon CTA buttons (hidden for Muqatta'at) */}
                        {!isMuqattaat && data.rootQuery ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 mt-3">
                            <Link
                              href={`/lexicon?root=${encodeURIComponent(data.rootQuery)}`}
                              className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all text-center"
                            >
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Explore Root [{data.rootQuery}] in Lexicons</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </Link>
                            
                            <Link
                              href={`/rag/chat?mode=lexicon&q=${encodeURIComponent(`What does the root ${data.rootQuery} mean?`)}`}
                              className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                            >
                              <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">Ask our Lexicon RAG</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </Link>
                          </div>
                        ) : !isMuqattaat ? (
                          <div className="text-[11px] text-slate-500 text-center">
                            No further lexicon entries for particle/non-root word
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Click to inspect word morphology
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })}
    </span>
  );
});
