"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAyahAudio } from "@/api/api";
import Link from "next/link";
import { toast } from "sonner";
import NavigatorButton from "@/components/NavigatorButton";
import { InteractiveAyahWords } from "@/components/quran/InteractiveAyahWords";
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
} from "lucide-react";
import SurahPlayer from "@/components/SurahPlayer";
import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { amiri } from "@/app/fonts";
import useScrollDirection from "@/hooks/useScrollDirection";
import { KeyValue } from "@/components/ui/key-value";

interface AyahProps {
  number: number;
  numberInSurah: number;
  text: string;
  cleanText: string;
  translation: string;
}

interface SurahReaderClientProps {
  surah: any;
  ayahs: AyahProps[];
  surahWordsMap: Record<number, any[]>;
  juzParam: string | null;
  ayahParam: string | null;
}

export default function SurahReaderClient({
  surah,
  ayahs,
  surahWordsMap,
  juzParam,
  ayahParam,
}: SurahReaderClientProps) {
  const { fontSize, showTranslation } = useGlobalState();
  const show = useScrollDirection();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(true);
  const [currentlyPlayingAyah, setCurrentlyPlayingAyah] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const surahNumber = surah?.number || 1;

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

  const handleCopyAyah = ({ numberInSurah, text, translation }: AyahProps) => {
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
  };

  const handleFetchAudio = async (ayah: AyahProps) => {
    const response = await fetchAyahAudio(surahNumber, ayah.numberInSurah);
    if (!response?.data?.audio) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (currentlyPlayingAyah === ayah.numberInSurah) {
      setCurrentlyPlayingAyah(null);
      return;
    }

    const audio = new Audio(response.data.audio);
    audioRef.current = audio;

    audio.play();
    setCurrentlyPlayingAyah(ayah.numberInSurah);

    audio.addEventListener("ended", () => {
      setCurrentlyPlayingAyah(null);
    });
  };

  const handleSaveAyah = (ayah: AyahProps) => {
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
  };

  return (
    <section className="w-full flex items-center flex-col dark:bg-zinc-900 bg-[var(--sephia-primary)] flex-1 dark:text-white text-black relative">
      <div className="w-full md:hidden flex p-4 sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-white/10">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back</span>
        </button>
      </div>
      <div
        className={cn(
          "hidden md:flex items-center justify-between w-full md:min-h-14 px-6 sticky top-0 backdrop-blur-md dark:bg-zinc-900/70 border-b bg-[var(--sephia-200)] border-white/10 transition-all duration-300 z-50 shadow-sm",
          !show && "-translate-y-24 opacity-0"
        )}
      >
        <div className="flex gap-3 items-center">
          <p
            className={`${amiri.className} dark:text-white text-black font-bold text-lg leading-tight`}
          >
            {surah?.name}
          </p>
        </div>
      </div>

      <div className="flex flex-col w-full min-h-screen blg:px-24 bpx-4">
        {/* Explore Container Hero Header */}
        <div className="relative pt-10 pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full border-b border-zinc-800/80 mb-8">
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

        {ayahs.map((ayah) => (
          <div
            key={ayah.numberInSurah}
            className="border-b-[0.1px] border-b-[var(--sephia-500)] dark:border-b-[#262629ff]
            sm:px-8 px-4 sm:py-12 py-4 flex flex-col items-end justify-end sm:flex-row  sm:gap-12 gap-4 transition-all duration-300"
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
                onClick={() => handleFetchAudio(ayah)}
                className="p-2 rounded-full hover:bg-zinc-800  transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {currentlyPlayingAyah === ayah.numberInSurah ? (
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
            </div>

            <div className="text-right sm:order-2 order-1 flex flex-col w-full">
              <p
                lang="ar"
                id={`atext-${ayah.numberInSurah}`}
                className={`${amiri.className} tracking-wide leading-loose font-light sm:pr-8 md:pr-16 lg:pr-26 md:pb-8 ${
                  fontSize === 0
                    ? "text-lg"
                    : fontSize === 1
                    ? "text-2xl"
                    : fontSize === 2
                    ? "text-3xl"
                    : fontSize === 3
                    ? "sm:text-3xl text-xl"
                    : fontSize === 4
                    ? "sm:text-5xl text-4xl"
                    : fontSize === 5
                    ? "text-6xl"
                    : "text-7xl"
                }`}
              >
                <span className="inline-flex items-center justify-center size-6 rounded-full text-xl mr-4">
                  ({convertNumberToArabicNumeral(ayah.numberInSurah)})
                </span>
                <InteractiveAyahWords
                  surahNumber={surahNumber}
                  ayahNumber={ayah.numberInSurah}
                  ayahText={ayah.text}
                  ayahWords={surahWordsMap[ayah.numberInSurah] || []}
                />
              </p>

              {showTranslation && (
                <div>
                  <p
                    className={cn(
                      "text-white md:leading-[1.2] leading-[1.8] md:ml-8 text-left pt-6 lg:w-2/3 md:w-4/6",
                      {
                        "text-sm": fontSize === 0,
                        "text-[12px]": fontSize === 1,
                        "text-lg": fontSize === 2,
                        "text-base": fontSize === 3,
                        "sm:text-2xl text-xl": fontSize === 4,
                        "text-3xl": fontSize === 5,
                        "text-4xl": fontSize === 6,
                        "text-5xl": fontSize === 7,
                        "text-6xl": fontSize >= 8,
                      }
                    )}
                  >
                    {ayah.translation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
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
      <div className="sticky bottom-0 bg-transparent p-4 w-full flex justify-center items-center">
        <SurahPlayer
          surahNumber={surahNumber}
          ayahText={ayahs.map((a) => a.cleanText)}
          lastAyahNumber={surah?.numberOfAyahs || 0}
          router={router}
        />
      </div>
    </section>
  );
}
