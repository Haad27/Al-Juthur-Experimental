'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkles, ArrowRight, BookOpen, Loader2, Bot } from 'lucide-react';

import { useGlobalState } from '@/lib/providers/GlobalStatesProvider';
import { useAudioStore } from '@/lib/stores/audioStore';
import { toast } from 'sonner';

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
}

export const InteractiveAyahWords: React.FC<InteractiveAyahWordsProps> = React.memo(({
  surahNumber,
  ayahNumber,
  ayahText,
  ayahWords,
  wbwTranslation,
  showWbw = true,
}) => {
  const { mushafStyle, wbwFontSize = 3 } = useGlobalState();
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
          <Popover key={idx} onOpenChange={(open) => { if (open) handleWordClick(wordIdx); }}>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
            <PopoverContent
              className="w-80 bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-2xl shadow-2xl z-50"
              side="top"
              align="center"
            >
              {loadingIndex === wordIdx && !data ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-sm">Analyzing root & morphology...</span>
                </div>
              ) : data ? (
                <div className="space-y-3.5">
                  {/* Header: Clicked Word + Location */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      {surahNumber}:{ayahNumber}:{wordIdx}
                    </span>
                    <span className="font-arabic text-2xl font-bold text-white">
                      {word}
                    </span>
                  </div>

                  {/* Morphology details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Root Word</span>
                      <span className={`text-base font-bold text-emerald-300 ${(!data.morphology.root || data.morphology.stem?.toLowerCase().includes('quranic initials') || data.morphology.root?.toLowerCase().includes('quranic initials')) ? 'font-sans text-sm' : 'font-arabic'}`}>
                        {(data.morphology.stem?.toLowerCase().includes('quranic initials') || data.morphology.root?.toLowerCase().includes('quranic initials')) ? 'None' : (data.morphology.root || 'N/A')}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Sarf (Morphology)</span>
                      <span className="font-arabic text-xs font-medium text-white leading-relaxed line-clamp-3">
                        {data.morphology.stem || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {data.morphology.irab && (
                    <div className="text-xs text-slate-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/50 leading-relaxed font-arabic text-right dir-rtl">
                      <strong className="text-emerald-400 font-semibold block mb-1 font-sans text-left dir-ltr">
                        I'rab (Grammar):
                      </strong>
                      {data.morphology.irab}
                    </div>
                  )}

                  {/* Lane's Summary preview */}
                  {data.rootSummary && (
                    <div className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
                      <strong className="text-emerald-400 font-semibold block mb-1">
                        Lane&apos;s Lexicon Summary:
                      </strong>
                      {data.rootSummary}
                    </div>
                  )}

                  {/* Deep Lexicon CTA buttons or Quranic Initials Message */}
                  {data.morphology.stem?.toLowerCase().includes('quranic initials') || data.morphology.root?.toLowerCase().includes('quranic initials') ? (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-center leading-relaxed">
                      These are <strong>Huroof-e-Muqatta&apos;at</strong> (Quranic Initials). No one knows their true meaning except ALLAH ﷻ.
                    </div>
                  ) : data.rootQuery ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <Link
                        href={`/lexicon?root=${encodeURIComponent(data.rootQuery)}`}
                        className="w-full px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Explore Root [{data.rootQuery}] in Lexicons
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      
                      <Link
                        href={`/rag/chat?mode=lexicon&q=${encodeURIComponent(`What does the root ${data.rootQuery} mean?`)}`}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        Ask our Lexicon RAG
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 text-center">
                      No further lexicon entries for particle/non-root word
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Click to inspect word morphology
                </div>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </span>
  );
});
