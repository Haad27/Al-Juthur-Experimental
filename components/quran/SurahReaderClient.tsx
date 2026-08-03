"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Library,
  MessageSquareText,
  Bot,
  Loader2,
} from "lucide-react";
import SurahPlayer from "@/components/SurahPlayer";
import AyahChatSidebar from "@/components/ai/AyahChatSidebar";
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
  onOpenAiChat: (surahNumber: number, ayahNumber: number) => void;
  isUrduTranslation: boolean;
  translationEdition: string;
}

function cleanUrduFootnoteText(html: string) {
  if (!html) return "";
  
  // If the footnote contains both a Translation section and a Tafsir section, remove the Translation section
  // It usually looks like: <b class="text-emerald-400">ترجمہ (تفہیم القرآن):</b> ... <b class="text-amber-400">تفسیر:</b>
  const tafsirMarkerRegex = /<b[^>]*>تفسیر:<\/b>/i;
  const match = html.match(tafsirMarkerRegex);
  if (match && match.index !== undefined) {
    html = html.substring(match.index);
  } else {
    // fallback if no tags
    const fallbackMarker = html.indexOf("تفسیر:");
    const fallbackMarkerEn = html.indexOf("Tafsir:");
    if (fallbackMarker > 10) {
      html = html.substring(fallbackMarker);
    } else if (fallbackMarkerEn > 10) {
      html = html.substring(fallbackMarkerEn);
    }
  }

  return html
    .replace(/<b class=['"]?text-emerald-400[^>]*>(.*?)<\/b>/gi, '<span class="text-zinc-300 font-semibold block mb-2">$1</span>')
    .replace(/<b class=['"]?text-amber-400[^>]*>(.*?)<\/b>/gi, '<span class="text-zinc-300 font-semibold block mt-3 mb-1">$1</span>')
    .replace(/<span class=['"]?text-emerald-400[^>]*>(.*?)<\/span>/gi, '<span class="text-zinc-300 font-semibold block mb-2">$1</span>')
    .replace(/class=['"]text-emerald-400['"]/g, 'class="text-zinc-300"')
    .replace(/class=['"]text-emerald-500['"]/g, 'class="text-zinc-400"');
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
  onOpenAiChat,
  isUrduTranslation,
  translationEdition,
}: AyahRowProps) => {
  const isCurrentlyPlaying = useAudioStore(s => s.currentAyah === ayah.numberInSurah && s.currentSurah === surahNumber);
  const playAyah = useAudioStore(s => s.playAyah);
  const pause = useAudioStore(s => s.pause);
  const [showFootnoteIds, setShowFootnoteIds] = useState(false);
  const [fetchedFootnotes, setFetchedFootnotes] = useState<Record<string, string>>({});
  const [loadingFootnotes, setLoadingFootnotes] = useState(false);
  const [pulseAi, setPulseAi] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("ayah_ai_seen")) {
      setPulseAi(true);
    }
  }, []);

  const isTafsirEdition = React.useMemo(() => {
    return ["158", "97", "234", "151", "84"].includes(translationEdition);
  }, [translationEdition]);

  const { mainText, footnotes } = React.useMemo(() => {
    return processTranslation(ayah.translation);
  }, [ayah.translation]);

  const hasFootnotesAvailable = React.useMemo(() => {
    return Boolean(ayah.footnoteIds?.length || footnotes.length > 0 || isTafsirEdition);
  }, [ayah.footnoteIds, footnotes, isTafsirEdition]);

  const handleToggleFootnotes = async () => {
    if (!showFootnoteIds) {
      setShowFootnoteIds(true);
      if (Object.keys(fetchedFootnotes).length === 0) {
        setLoadingFootnotes(true);
        const newFootnotes = { ...fetchedFootnotes };

        // 1. If it's a translation with Tafsir/Commentary (Dr. Israr, Maududi, Taqi Usmani)
        if (isTafsirEdition) {
          try {
            let authorId = "100158";
            if (translationEdition === "97" || translationEdition === "234") authorId = "138";
            if (translationEdition === "151" || translationEdition === "84") authorId = "139";
            if (translationEdition === "158") authorId = "158";

            const res = await fetch(`/api/tafsir?authorId=${authorId}&surahId=${surahNumber}&ayahId=${ayah.numberInSurah}`);
            if (res.ok) {
              const data = await res.json();
              if (data.data && data.data[0]?.text) {
                newFootnotes["tafsir_note"] = data.data[0].text;
              }
            }
          } catch(e) {
            console.error("Error fetching dynamic tafsir note:", e);
          }
        }

        // 2. Standard Quran.com API footnotes
        if (ayah.footnoteIds && ayah.footnoteIds.length > 0) {
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

  const getTranslationFontSize = (size: number, isUrdu: boolean): string => {
    if (isUrdu) {
      if (size <= 0.5) return "0.95rem";
      if (size <= 1)   return "1.05rem";
      if (size <= 1.5) return "1.1rem";
      if (size <= 2)   return "1.15rem";
      if (size <= 2.5) return "1.25rem";
      if (size <= 3)   return "1.35rem";
      if (size <= 3.5) return "1.45rem";
      if (size <= 4)   return "1.5rem";
      if (size <= 4.5) return "1.57rem";
      if (size <= 5)   return "1.65rem";
      if (size <= 5.5) return "1.75rem";
      if (size <= 6)   return "1.85rem";
      if (size <= 6.5) return "1.97rem";
      if (size <= 7)   return "2.1rem";
      if (size <= 7.5) return "2.25rem";
      return "2.4rem";
    }
    
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
          <Library className="text-amber-500 hover:text-amber-400" size={18} />
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

        {showTranslation && (
          <div className={cn("pt-4 text-left w-full", isUrduTranslation ? "w-full sm:pr-8 md:pr-16 lg:pr-26" : "md:ml-8 lg:w-2/3 md:w-4/6")}>
            <div>
              <span
                className="text-white md:leading-[1.5] leading-[1.8] translation-content"
                style={{ 
                  fontSize: getTranslationFontSize(fontSize, isUrduTranslation),
                  fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                  lineHeight: isUrduTranslation ? "2.6" : undefined,
                  textAlign: isUrduTranslation ? "right" : undefined,
                  direction: isUrduTranslation ? "rtl" : undefined,
                  display: "block",
                  width: "100%"
                }}
                dangerouslySetInnerHTML={{ __html: mainText }}
              />
            </div>

            {(hasFootnotesAvailable && showFootnoteIds) ? (
              <div className="mt-3 p-4 rounded-xl bg-zinc-950/90 border border-emerald-500/30 text-sm text-zinc-100 max-h-80 overflow-y-auto custom-scrollbar relative shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] sticky -top-4 -mx-4 px-4 py-2.5 bg-zinc-950/95 backdrop-blur-md z-10 mb-3 border-b border-emerald-500/20 shadow-sm flex items-center justify-between">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                    FOOTNOTES & COMMENTARY NOTES
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {isTafsirEdition ? "EXPLANATIONS" : "FOOTNOTES"}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {loadingFootnotes ? (
                    <p className="text-emerald-400/80 animate-pulse text-xs py-2">Loading notes...</p>
                  ) : (
                    <>
                      {/* Dynamic Tafsir / Explanation Note for Dr. Israr, Maududi, Taqi Usmani */}
                      {fetchedFootnotes["tafsir_note"] && (
                        <div 
                          className="leading-[2.8] text-zinc-100 text-right p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 font-nastaliq"
                          dir={isUrduTranslation ? "rtl" : "auto"}
                          style={{ 
                            fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                            lineHeight: isUrduTranslation ? "2.8" : undefined,
                            fontSize: isUrduTranslation ? "1.15rem" : undefined,
                            color: "#f4f4f5"
                          }}
                          dangerouslySetInnerHTML={{ __html: cleanUrduFootnoteText(fetchedFootnotes["tafsir_note"]) }}
                        />
                      )}

                      {/* Inline/extracted footnotes */}
                      {footnotes.length > 0 && footnotes.map((fn, fIdx) => (
                        <div key={`inline-${fIdx}`} className="leading-relaxed text-zinc-200 p-2.5 rounded bg-zinc-900/60 border border-zinc-800" dir="auto">
                          {fn}
                        </div>
                      ))}

                      {/* API fetched footnotes */}
                      {ayah.footnoteIds && ayah.footnoteIds.length > 0 && (
                        ayah.footnoteIds.map((fId, idx) => (
                          <div 
                            key={fId} 
                            className="leading-relaxed p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-zinc-100" 
                            dir={isUrduTranslation ? "rtl" : "auto"}
                            style={{ 
                              fontFamily: isUrduTranslation ? "'Noto Nastaliq Urdu', serif" : undefined,
                              lineHeight: isUrduTranslation ? "2.6" : undefined,
                              fontSize: isUrduTranslation ? "1.1rem" : undefined,
                              color: "#f4f4f5"
                            }}
                          >
                            <span className="text-emerald-400 font-bold mx-2 inline-block" dir="ltr">[{idx + 1}]</span>
                            <span dangerouslySetInnerHTML={{ __html: fetchedFootnotes[fId] || "Footnote unavailable." }} />
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {/* Actions: AI Chat & Footnotes */}
            <div className="mt-5 mb-2 flex flex-wrap items-center gap-3">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500/30 blur-md rounded-full animate-pulse"></div>
                <button
                  onClick={() => {
                    setPulseAi(false);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("ayah_ai_seen", "true");
                    }
                    onOpenAiChat(surahNumber, ayah.numberInSurah);
                  }}
                  className="relative group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 transition-all hover:border-emerald-400 hover:scale-[1.02] cursor-pointer"
                >
                  <Bot size={14} className="text-emerald-400 animate-bounce" />
                  <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-300 group-hover:text-white">
                    ✨ Ask Tafsir Scholar
                  </span>
                </button>
              </div>

              {hasFootnotesAvailable && (
                <button
                  onClick={handleToggleFootnotes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 hover:border-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-[1.02] cursor-pointer group"
                  title={showFootnoteIds ? "Hide Footnotes" : "Show Footnotes & Commentary"}
                >
                  <MessageSquareText size={14} className="text-emerald-400 group-hover:text-emerald-300" />
                  <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-300 group-hover:text-white">
                    {showFootnoteIds ? "Hide Notes" : "Footnotes"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
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
  
  const [aiChatContext, setAiChatContext] = useState<{ surah: number; ayah: number } | null>(null);

  const handleOpenAiChat = (surah: number, ayah: number) => {
    setAiChatContext({ surah, ayah });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("close-left-sidebar"));
    }
  };

  // Auto-scroll listener for audio player
  useEffect(() => {
    const handleScroll = (e: any) => {
      const index = e.detail?.index;
      if (typeof index === 'number') {
        virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      }
    };
    const handleJump = (e: any) => {
      const index = e.detail?.index;
      if (typeof index === 'number') {
        setIsNavigatingAyah(true);
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
          setTimeout(() => {
            const element = document.getElementById(`ayah-${index + 1}`);
            if (element) {
              const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
              element.classList.add(...c);
              setTimeout(() => element.classList.remove(...c), 2000);
            }
            setIsNavigatingAyah(false);
          }, 300);
        }, 100);
      }
    };
    window.addEventListener('scrollToAyah', handleScroll);
    window.addEventListener('jumpToAyah', handleJump);
    return () => {
      window.removeEventListener('scrollToAyah', handleScroll);
      window.removeEventListener('jumpToAyah', handleJump);
    }
  }, []);

  const [collapsed, setCollapsed] = useState(true);
  const [isNavigatingAyah, setIsNavigatingAyah] = useState(false);

  const surahNumber = surah?.number || 1;
  
  const isUrduTranslation = React.useMemo(() => {
    return ALL_TRANSLATION_OPTIONS.find(t => t.identifier === translationEdition)?.languageCode.toLowerCase() === 'urdu';
  }, [translationEdition]);

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
      const ayahIndex = ayahs.findIndex(a => a.numberInSurah.toString() === ayahParam);
      if (ayahIndex !== -1) {
        setIsNavigatingAyah(true);
        
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: ayahIndex, align: 'center', behavior: 'smooth' });
          
          setTimeout(() => {
            const element = document.getElementById(`ayah-${ayahParam}`);
            if (element) {
              const c = ["dark:bg-[#1c1c1cff]", "bg-[var(--sephia-300)]"];
              element.classList.add(...c);
              setTimeout(() => {
                element.classList.remove(...c);
              }, 2000);
            }
            setIsNavigatingAyah(false);
          }, 300);
        }, 100);
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
    <div className="flex w-full min-h-screen relative overflow-hidden">
      {/* Loading Overlay */}
      {isNavigatingAyah && (
        <div className="fixed inset-0 z-[99999] bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
            <Loader2 className="size-10 animate-spin text-emerald-500" />
            <p className="text-zinc-300 font-medium tracking-wide">Navigating to Verse...</p>
          </div>
        </div>
      )}

      <section className={cn(
        "flex items-center flex-col dark:bg-zinc-900 bg-[var(--sephia-primary)] dark:text-white text-black relative pb-10 md:pb-4 transition-all duration-300",
        aiChatContext ? "w-full lg:w-[calc(100%-400px)] xl:w-[calc(100%-450px)]" : "w-full flex-1"
      )}>
        <div
          className={cn(
          "hidden md:flex fixed items-center justify-between md:min-h-14 px-6 py-3 backdrop-blur-lg dark:bg-zinc-900/90 border-b bg-[var(--sephia-200)] dark:border-zinc-800/80 border-white/10 transition-all duration-300 z-50 shadow-sm",
          show ? "top-0" : "-top-24",
          aiChatContext ? "w-full lg:w-[calc(100%-400px)] xl:w-[calc(100%-450px)]" : "w-[calc(100%-350px)]"
        )}
      >
        {/* Surah Name & Selected Translation */}
        <div className="flex items-center gap-4">
          <p
            className={`font-mushaf-v2 dark:text-white text-black text-2xl leading-tight flex items-center gap-3`}
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
              <p className={`font-mushaf-v2 text-5xl md:text-7xl text-amber-100/90 font-normal leading-normal`}>
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
                onOpenAiChat={handleOpenAiChat}
                isUrduTranslation={isUrduTranslation}
                translationEdition={translationEdition}
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

      <AyahChatSidebar
        surahNumber={aiChatContext?.surah || 0}
        ayahNumber={aiChatContext?.ayah || 0}
        isOpen={!!aiChatContext}
        onClose={() => setAiChatContext(null)}
      />
    </div>
  );
}
