"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAyahAudio } from "@/api/api";
import Link from "next/link";
import { toast } from "sonner";
import NavigatorButton from "@/components/NavigatorButton";
import { InteractiveAyahWords } from "@/components/quran/InteractiveAyahWords";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useAudioStore } from "@/lib/stores/audioStore";
import { cn, convertNumberToArabicNumeral } from "@/lib/utils";
import BismillahIcon from "@/components/svg/icons/BismillahIcon";
import {
  ArrowLeft,
  Check,
  ChevronUp,
  Copy,
  Pause,
  Play,
  Save,
  ScrollText,
  BookOpen,
} from "lucide-react";
import SurahPlayer from "@/components/SurahPlayer";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { amiri } from "@/app/fonts";
import useScrollDirection from "@/hooks/useScrollDirection";
import { KeyValue } from "@/components/ui/key-value";
import { ALL_TRANSLATION_OPTIONS } from "@/lib/translationsManifest";

interface AyahProps {
  number: number;
  numberInSurah: number;
  text: string;
  cleanText: string;
  translation: string;
  footnoteIds?: string[];
}

interface SurahReaderClientProps {
  surah: any;
  ayahs: AyahProps[];
  surahWordsMap: Record<number, any[]>;
  juzParam: string | null;
  ayahParam: string | null;
  surahWbwTranslation?: Record<string, string>;
}

interface AyahRowProps {
  ayah: AyahProps;
  surahNumber: number;
  surahWordsMap: Record<number, any[]>;
  fontSize: number;
  showTranslation: boolean;
  showWbw: boolean;
  surahWbwTranslation?: Record<string, string>;
  handleCopyAyah: (ayah: AyahProps) => void;
  handleSaveAyah: (ayah: AyahProps) => void;
}

function processTranslation(rawText: string) {
  if (!rawText) return { mainText: "", footnotes: [] as string[] };

  let clean = rawText.trim();
  const footnotes: string[] = [];

  // Extract footnote patterns like: [1] ... or (1) ... or \n[1] ...
  const fnRegex = /(?:^|\n|\s)(\[\d+\]|\(\d+\)|\d+\.)\s*([^\n\[\]]+)/g;
  let fnMatch;
  while ((fnMatch = fnRegex.exec(clean)) !== null) {
    if (fnMatch[0]) {
      footnotes.push(fnMatch[0].trim());
    }
  }

  // Remove trailing footnotes from main text if match was found
  if (footnotes.length > 0) {
    const firstFnMarkerIndex = clean.search(/(?:\n|\s+)(\[\d+\]|\(\d+\)|\d+\.)\s*/);
    if (firstFnMarkerIndex > 0) {
      clean = clean.substring(0, firstFnMarkerIndex).trim();
    }
  }

  // Extract embedded double-bracket footnotes like: [[ This is a footnote ]]
  const doubleBracketRegex = /\[\[(.*?)\]\]/g;
  let dbMatch;
  while ((dbMatch = doubleBracketRegex.exec(clean)) !== null) {
    if (dbMatch[1]) {
      footnotes.push(dbMatch[1].trim());
    }
  }
  // Remove the double-bracket footnotes from the main text
  clean = clean.replace(/\[\[.*?\]\]/g, '').replace(/\s{2,}/g, ' ').trim();

  // Deduplicate identical sentences (e.g. duplicate sentences appended by mistake)
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const uniqueSentences = sentences.filter((s, idx) => {
    const lower = s.trim().toLowerCase();
    return lower && sentences.findIndex((other) => other.trim().toLowerCase() === lower) === idx;
  });

  clean = uniqueSentences.join(" ");

  return { mainText: clean, footnotes };
}

const AyahRow = React.memo(({
  ayah,
  surahNumber,
  surahWordsMap,
  fontSize,
  showTranslation,
  showWbw,
  surahWbwTranslation,
  handleCopyAyah,
  handleSaveAyah,
}: AyahRowProps) => {
  const isCurrentlyPlaying = useAudioStore(s => s.currentAyah === ayah.numberInSurah && s.currentSurah === surahNumber);
  const playAyah = useAudioStore(s => s.playAyah);
  const pause = useAudioStore(s => s.pause);
  const [showFootnoteIds, setShowFootnoteIds] = useState(false);
  const [fetchedFootnotes, setFetchedFootnotes] = useState<Record<string, string>>({});
  const [loadingFootnotes, setLoadingFootnotes] = useState(false);

  const handleToggleFootnotes = async () => {
    if (!showFootnoteIds) {
      setShowFootnoteIds(true);
      if (ayah.footnoteIds && ayah.footnoteIds.length > 0 && Object.keys(fetchedFootnotes).length === 0) {
        setLoadingFootnotes(true);
        const newFootnotes = { ...fetchedFootnotes };
        for (const fId of ayah.footnoteIds) {
          try {
            const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${fId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.foot_note) {
                newFootnotes[fId] = data.foot_note.text;
              }
            }
          } catch(e) {
            console.error(e);
          }
        }
        setFetchedFootnotes(newFootnotes);
        setLoadingFootnotes(false);
      }
    } else {
      setShowFootnoteIds(false);
    }
  };

  const { mushafStyle } = useGlobalState();

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
      // Legacy compat
      case "uthmani":         return "font-mushaf-v2";
      case "amiri":           return "font-mushaf-warsh";
      default:                return "font-mushaf-v2";
    }
  }, [mushafStyle]);


  const handleFetchAudio = async () => {
    if (isCurrentlyPlaying) {
      pause();
      return;
    }
    const response = await fetchAyahAudio(surahNumber, ayah.numberInSurah);
    if (response?.data?.audio) {
      playAyah(surahNumber, ayah.numberInSurah, response.data.audio);
    }
  };

  const getArabicFontSize = (size: number): string => {
    if (size <= 0.5) return "1.1rem";
    if (size <= 1)   return "1.4rem";
    if (size <= 1.5) return "1.6rem";
    if (size <= 2)   return "1.8rem";
    if (size <= 2.5) return "2.0rem";
    if (size <= 3)   return "2.2rem";
    if (size <= 3.5) return "2.4rem";
    if (size <= 4)   return "2.6rem";
    if (size <= 4.5) return "2.85rem";
    if (size <= 5)   return "3.1rem";
    if (size <= 5.5) return "3.35rem";
    if (size <= 6)   return "3.6rem";
    if (size <= 6.5) return "3.9rem";
    if (size <= 7)   return "4.2rem";
    if (size <= 7.5) return "4.5rem";
    return "4.8rem";
  };

  const getTranslationFontSize = (size: number): string => {
    if (size <= 0.5) return "0.75rem";
    if (size <= 1)   return "0.85rem";
    if (size <= 1.5) return "0.9rem";
    if (size <= 2)   return "0.95rem";
    if (size <= 2.5) return "1.0rem";
    if (size <= 3)   return "1.05rem";
    if (size <= 3.5) return "1.12rem";
    if (size <= 4)   return "1.2rem";
    if (size <= 4.5) return "1.27rem";
    if (size <= 5)   return "1.35rem";
    if (size <= 5.5) return "1.45rem";
    if (size <= 6)   return "1.55rem";
    if (size <= 6.5) return "1.67rem";
    if (size <= 7)   return "1.8rem";
    if (size <= 7.5) return "1.95rem";
    return "2.1rem";
  };


  return (
    <div
      className="border-b-[0.1px] border-b-[var(--sephia-500)] dark:border-b-[#262629ff] sm:px-8 pl-4 pr-1 sm:py-12 py-4 flex flex-col items-end justify-end sm:flex-row sm:gap-12 gap-4 transition-all duration-300"
      id={`ayah-${ayah.numberInSurah}`}
    >
      <div className="h-full flex flex-row sm:order-1 order-2 sm:flex-col gap-3 sm:justify-center items-center transition-all duration-300">
        <p className="text-lg font-light text-zinc-400 ">
          {surahNumber}:{ayah.numberInSurah}
        </p>
        <div className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center">
          <Copy
            className="text-zinc-400"
            size={18}
            onClick={() => handleCopyAyah(ayah)}
          />
        </div>
        <div
          onClick={() => handleSaveAyah(ayah)}
          className="p-2 rounded-full dark:hover:bg-zinc-800 hover:bg-[var(--sephia-500)]/45 transition-colors cursor-pointer inline-flex items-center justify-center"
        >
          <Save className="text-zinc-400" size={18} />
        </div>
        <div
          onClick={handleFetchAudio}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
        >
          {isCurrentlyPlaying ? (
            <Pause className="text-zinc-400" size={18} />
          ) : (
            <Play className="text-zinc-400" size={18} />
          )}
        </div>
        <Link
          href={`/tafsir?surah=${surahNumber}&ayah=${ayah.numberInSurah}`}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Read Tafsir"
        >
          <ScrollText className="text-emerald-500 hover:text-emerald-400" size={18} />
        </Link>
        <Link
          href={`/lexicon?surah=${surahNumber}&ayah=${ayah.numberInSurah}`}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer inline-flex items-center justify-center"
          title="Read Lexicon"
        >
          <BookOpen className="text-amber-500 hover:text-amber-400" size={18} />
        </Link>
      </div>

      <div className="text-right sm:order-2 order-1 flex flex-col w-full">
        <p
          lang="ar"
          id={`atext-${ayah.numberInSurah}`}
          className={`${mushafFontClass} tracking-wide leading-loose font-light sm:pr-8 md:pr-16 lg:pr-26 md:pb-8`}
          style={{ fontSize: getArabicFontSize(fontSize) }}
        >
          <span className="inline-flex items-center justify-center size-6 rounded-full text-xl mr-4">
            ({convertNumberToArabicNumeral(ayah.numberInSurah)})
          </span>
          <InteractiveAyahWords
            surahNumber={surahNumber}
            ayahNumber={ayah.numberInSurah}
            ayahText={ayah.text}
            ayahWords={surahWordsMap[ayah.numberInSurah] || []}
            wbwTranslation={surahWbwTranslation}
            showWbw={showWbw}
          />
        </p>

        {showTranslation && (() => {
          const { mainText, footnotes } = processTranslation(ayah.translation);
          return (
            <div className="pt-4 md:ml-8 lg:w-2/3 md:w-4/6 text-left">
              <div>
                <span
                  className="text-white md:leading-[1.5] leading-[1.8] translation-content"
                  style={{ fontSize: getTranslationFontSize(fontSize) }}
                  dangerouslySetInnerHTML={{ __html: mainText }}
                />
                {(ayah.footnoteIds?.length || footnotes.length > 0) ? (
                  <button
                    onClick={handleToggleFootnotes}
                    className="inline-flex items-center justify-center ml-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-colors align-middle rounded-full bg-emerald-500/10 p-1.5 cursor-pointer"
                    title={showFootnoteIds ? "Hide Footnotes" : "Show Footnotes"}
                  >
                    <BookOpen size={14} />
                  </button>
                ) : null}
              </div>

              {((ayah.footnoteIds?.length || footnotes.length > 0) && showFootnoteIds) ? (
                <div className="mt-3 p-4 rounded-xl bg-zinc-900/60 border border-emerald-900/50 text-sm text-zinc-300 max-h-80 overflow-y-auto custom-scrollbar relative">
                  <div className="font-semibold text-emerald-500 uppercase tracking-wider text-[11px] sticky -top-4 -mx-4 px-4 py-3 bg-zinc-900/95 backdrop-blur-md z-10 mb-3 border-b border-emerald-900/30 shadow-sm">
                    Footnotes
                  </div>
                  
                  <div className="space-y-3">
                    {/* Inline/extracted footnotes */}
                    {footnotes.length > 0 && footnotes.map((fn, fIdx) => (
                      <div key={`inline-${fIdx}`} className="leading-relaxed text-zinc-400 italic" dir="auto">
                        {fn}
                      </div>
                    ))}

                    {/* API fetched footnotes */}
                    {ayah.footnoteIds && ayah.footnoteIds.length > 0 && (
                      loadingFootnotes ? (
                        <p className="text-zinc-500 animate-pulse">Loading footnotes...</p>
                      ) : (
                        ayah.footnoteIds.map((fId, idx) => (
                          <div key={fId} className="leading-relaxed" dir="auto">
                            <span className="text-emerald-500 font-bold mr-2 inline-block" dir="ltr">[{idx + 1}]</span>
                            <span dangerouslySetInnerHTML={{ __html: fetchedFootnotes[fId] || "Footnote unavailable." }} />
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>
    </div>
  );

});

export default function SurahReaderClient({
  surah,
  ayahs,
  surahWordsMap,
  juzParam,
  ayahParam,
  surahWbwTranslation,
}: SurahReaderClientProps) {
  const { fontSize, showTranslation, showWbw, translationEdition } = useGlobalState();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const show = useScrollDirection();
  const router = useRouter();

  // Auto-scroll listener for audio player
  useEffect(() => {
    const handleScroll = (e: any) => {
      const index = e.detail?.index;
      if (typeof index === 'number') {
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    };
    window.addEventListener('scrollToAyah', handleScroll);
    return () => window.removeEventListener('scrollToAyah', handleScroll);
  }, []);

  const [collapsed, setCollapsed] = useState(true);

  const surahNumber = surah?.number || 1;

  // Clear audio state on unmount or surah change
  useEffect(() => {
    const clearAudio = useAudioStore.getState().clearAudio;
    return () => clearAudio();
  }, [surahNumber]);

  useEffect(() => {
    if (surah) {
      localStorage.setItem("recent", JSON.stringify(surah));
    }
  }, [surah]);

  // Scroll to the selected ayah (if provided via the "ayah" search param)
  useEffect(() => {
    if (ayahParam && ayahs.length > 0) {
      const element = document.getElementById(`ayah-${ayahParam}`);
      if (element) {
        toast("Scrolling to requested Ayah");
        const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
        element.classList.add(...c);

        element.scrollIntoView({ behavior: "auto", block: "center" });

        const b = setTimeout(() => {
          element.classList.remove(...c);
        }, 2000);

        return () => clearTimeout(b);
      } else {
        toast("Requested ayah was not found");
      }
    }
  }, [ayahParam, ayahs]);

  const handleCopyAyah = React.useCallback(({ numberInSurah, text, translation }: AyahProps) => {
    navigator.clipboard.writeText(
      `${text} ${translation} [${surahNumber}:${numberInSurah}]`
    );
    toast(
      <div className="flex items-center gap-3">
        <Check size={22} />
        <div>
          <p className="font-semibold">Copied Verse to Clipboard</p>
        </div>
      </div>,
      {
        className:
          "bg-[var(--sephia-200)] dark:bg-[#27272A] text-black dark:text-white",
        duration: 3000,
      }
    );
  }, [surahNumber]);

  const handleSaveAyah = React.useCallback((ayah: AyahProps) => {
    const saved = JSON.parse(localStorage.getItem("saved-ayahs") || "[]");
    const alreadySaved = saved.some((item: AyahProps) => item.number === ayah.number);

    if (alreadySaved) {
      toast(
        <div className="flex items-center gap-3">
          <p className="text-3xl">🧾</p>
          <div>
            <p className="font-semibold text-emerald-500">Already saved</p>
            <p className="text-sm text-black">
              This ayah is already in your saved list.
            </p>
          </div>
        </div>
      );
      return;
    }

    const updated = [...saved, { ...ayah, surahNumber }];
    localStorage.setItem("saved-ayahs", JSON.stringify(updated));

    toast(
      <div className="flex items-center gap-3">
        <Check size={36} />
        <div>
          <p className="font-semibold text-emerald-500">Saved Ayah</p>
        </div>
      </div>
    );
  }, [surahNumber]);

  return (
    <section className="w-full flex items-center flex-col dark:bg-zinc-900 bg-[var(--sephia-primary)] flex-1 dark:text-white text-black relative pb-28 md:pb-12">
      <div
        className={cn(
          "hidden md:flex items-center justify-between w-full md:min-h-14 px-6 py-3 sticky top-0 backdrop-blur-lg dark:bg-zinc-900/90 border-b bg-[var(--sephia-200)] dark:border-zinc-800/80 border-white/10 transition-all duration-300 z-50 shadow-sm",
          !show && "-translate-y-24 opacity-0"
        )}
      >
        {/* Surah Name & Selected Translation */}
        <div className="flex items-center gap-4">
          <p
            className={`${amiri.className} dark:text-white text-black font-bold text-lg leading-tight flex items-center gap-3`}
          >
            {surah?.name}
            {translationEdition && (
              <span className="text-xs font-medium font-sans px-2.5 py-1 bg-emerald-500/10 rounded-md text-emerald-600 dark:text-emerald-400">
                {ALL_TRANSLATION_OPTIONS.find((t) => t.identifier === translationEdition)?.name || "Translation"}
              </span>
            )}
          </p>
        </div>

        {/* Desktop Full Navigation */}
        <nav className="hidden lg:flex items-center gap-6 text-zinc-400 text-sm">
          <Link href="/home" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">
            Home
          </Link>
          <Link href="/tafsir" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">
            Tafsir
          </Link>
          <Link href="/lexicon" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">
            Lexicon
          </Link>
          <Link href="/ai" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">
            AI Translator
          </Link>
          <Link href="/rag" className="cursor-pointer hover:text-gray-300 transition dark:text-zinc-400 text-zinc-600">
            RAG Bot
          </Link>
        </nav>
      </div>

      <div className="flex flex-col w-full min-h-screen lg:px-24 px-0">
        {/* Explore Container Hero Header */}
        <div className="relative pt-28 md:pt-10 pb-8 pl-4 pr-1 md:px-8 max-w-7xl mx-auto w-full border-b border-zinc-800/80 mb-8">
          <div className="absolute left-10 top-10 size-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span>Surah {surah?.number || surahNumber}</span>
                <span>•</span>
                <span>{surah?.revelationType || "Meccan"}</span>
                <span>•</span>
                <span>{surah?.numberOfAyahs || 0} Ayahs</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                {surah?.englishName}
              </h1>
              <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
                {surah?.englishNameTranslation}
              </p>
            </div>

            <div className="text-right">
              <p className={`${amiri.className} text-4xl md:text-6xl text-amber-100/90 font-normal leading-normal`}>
                {surah?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center text-center w-full flex-col mb-8">
          <BismillahIcon className="dark:text-white text-black lg:max-w-96 md:max-w-86 max-w-72" />
        </div>

        <Virtuoso
          ref={virtuosoRef}
          useWindowScroll
          totalCount={ayahs.length}
          itemContent={(index) => {
            const ayah = ayahs[index];
            return (
              <AyahRow
                key={ayah.numberInSurah}
                ayah={ayah}
                surahNumber={surahNumber}
                surahWordsMap={surahWordsMap}
                fontSize={fontSize}
                showTranslation={showTranslation}
                showWbw={showWbw}
                surahWbwTranslation={surahWbwTranslation}
                handleCopyAyah={handleCopyAyah}
                handleSaveAyah={handleSaveAyah}
              />
            );
          }}
        />
      </div>

      <div className="mb-6 w-full flex justify-center items-center">
        <div className="flex gap-4 w-full max-w-md px-2 justify-center mt-4">
          <NavigatorButton
            direction="Previous"
            surahNumber={surahNumber > 1 ? surahNumber - 1 : 1}
          />
          <NavigatorButton
            direction="Next"
            surahNumber={surahNumber < 114 ? surahNumber + 1 : 114}
          />
        </div>
      </div>
      <div className="fixed md:sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0 bg-transparent p-2 md:p-4 w-full flex justify-center items-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <SurahPlayer
            surahNumber={surahNumber}
            ayahText={ayahs.map((a) => a.cleanText)}
            lastAyahNumber={surah?.numberOfAyahs || 0}
            router={router}
          />
        </div>
      </div>
    </section>
  );
}
