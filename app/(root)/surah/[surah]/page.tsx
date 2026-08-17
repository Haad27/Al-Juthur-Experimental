import React from "react";
import SurahReaderClient from "@/components/quran/SurahReaderClient";
import prisma from "@/lib/prisma";
import { SURAHS_DATA } from "@/lib/surahsData";
import { getQuranComSurahTranslation } from "@/lib/translations";
import fs from "fs";
import path from "path";
import { stripBismillahPrefix } from "@/lib/utils";
import { unstable_cache } from "next/cache";

// ISR + SSG: Pre-generate all 114 Surahs at build time on Vercel CDN.
// This ensures that loading any Surah is 100% instant (<30ms) directly from the Edge CDN.
export const revalidate = 86400;

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({
    surah: (i + 1).toString(),
  }));
}

const removeDiacritics = (text: string) => {
  return text.replace(/[\u064B-\u065F\u0670]/g, ""); // removes harakat + dagger alif
};

// Persistent cache for Ayahs — survives Vercel cold starts.
const getAyahsForSurah = unstable_cache(
  async (surahNumber: number) => {
    return await prisma.ayah.findMany({
      where: { surahId: surahNumber },
      orderBy: { numberInSurah: "asc" },
      select: { id: true, surahId: true, numberInSurah: true, text: true }
    });
  },
  ["surah-ayahs-v4"],
  { revalidate: 2592000 } // 30 days
);

// Persistent cache for WBW translation JSON — cached for 30 days.
const getWbwTranslation = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const filePath = path.join(process.cwd(), 'database', 'word-by-word-translation', 'english-wbw-translation.json');
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileData);
      }
      return require('@/database/word-by-word-translation/english-wbw-translation.json');
    } catch (e) {
      try {
        return require('@/database/word-by-word-translation/english-wbw-translation.json');
      } catch (err) {
        console.error("Could not load WBW translation:", err);
        return {};
      }
    }
  },
  ['wbw-translation-data-v4'],
  { revalidate: 2592000 }
);

// Persistent cache for Surah info
const getSurahInfoMap = unstable_cache(
  async (): Promise<Record<string, any>> => {
    try {
      const surahInfoPath = path.join(process.cwd(), "database", "surah-meta", "surah-info-en.json");
      if (fs.existsSync(surahInfoPath)) {
        return JSON.parse(fs.readFileSync(surahInfoPath, "utf-8"));
      }
      return require('@/database/surah-meta/surah-info-en.json');
    } catch (e) {
      try {
        return require('@/database/surah-meta/surah-info-en.json');
      } catch (err) {
        console.error("Error loading surah info:", err);
        return {};
      }
    }
  },
  ['surah-info-meta-v4'],
  { revalidate: 2592000 }
);

export default async function SurahPage({
  params,
  searchParams,
}: {
  params: Promise<{ surah: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const surahNumber = Number(resolvedParams.surah);
  if (!surahNumber || isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return <div className="p-8 text-center text-white">Invalid Surah</div>;
  }

  const ayahParam = typeof resolvedSearchParams?.ayah === "string" ? resolvedSearchParams.ayah : null;
  const juzParam = typeof resolvedSearchParams?.juz === "string" ? resolvedSearchParams.juz : null;
  const editionParam = typeof resolvedSearchParams?.trans === "string" ? resolvedSearchParams.trans : "en.sahih";

  // 1. Fetch Surah metadata directly from local memory
  const surahMetadata = SURAHS_DATA.find(s => s.number === surahNumber) || {
    number: surahNumber,
    name: "",
    englishName: `Surah ${surahNumber}`,
    englishNameTranslation: "",
    numberOfAyahs: 0,
    revelationType: "Meccan"
  };

  // 2. Fetch required data in PARALLEL via Promise.all
  // We do NOT load massive morphology table on server SSR to keep HTML payload < 20KB (like Quran.com)
  const [localAyahs, translationAyahs, wbwTranslationData, allSurahInfo] = await Promise.all([
    getAyahsForSurah(surahNumber),
    getQuranComSurahTranslation(surahNumber, editionParam),
    getWbwTranslation(),
    getSurahInfoMap(),
  ]);

  const surahInfo = allSurahInfo[surahNumber] || allSurahInfo[String(surahNumber)] || null;

  // 3. Pre-compute lookup map for translations
  const translationMap = new Map<number, string>();
  const footnoteMap = new Map<number, string[]>();
  
  translationAyahs.forEach((t, index) => {
    let cleanText = "";
    const fIds: string[] = [];
    
    if (typeof t.text === "string") {
      let fIdsCount = 0;
      cleanText = t.text.replace(
        /<(?:sup|a|span)\b[^>]*(?:foot_note|footnote_id|footnote-id|footnote|data-foot_note|data-footnote)=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/(?:sup|a|span)>/gi,
        (_match: string, id: string) => {
          fIds.push(id);
          fIdsCount++;
          return `<span class="text-emerald-500 font-bold mx-1 cursor-pointer footnote-ref" data-findex="${fIdsCount}" data-fid="${id}">[${fIdsCount}]</span>`;
        }
      );
      cleanText = cleanText.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, "$1");
    } else {
      cleanText = t.text || "";
    }
    
    const verseNum = t.verse_number || t.numberInSurah || (index + 1);
    translationMap.set(verseNum, cleanText);
    footnoteMap.set(verseNum, fIds);
  });

  // 4. Merge Arabic with English translation
  const combinedAyahs = localAyahs.map((localAyah) => {
    const rawText = stripBismillahPrefix(localAyah.text, surahNumber, localAyah.numberInSurah);
    return {
      number: localAyah.id,
      numberInSurah: localAyah.numberInSurah,
      text: rawText,
      cleanText: removeDiacritics(rawText),
      translation: translationMap.get(localAyah.numberInSurah) || "Translation missing.",
      footnoteIds: footnoteMap.get(localAyah.numberInSurah) || [],
    };
  });

  // 5. Generate word-by-word translation map for this Surah
  const surahWbwTranslation: Record<string, string> = {};
  if (wbwTranslationData && typeof wbwTranslationData === 'object') {
    const prefix = `${surahNumber}:`;
    for (const key of Object.keys(wbwTranslationData)) {
      if (key.startsWith(prefix)) {
        const parts = key.split(':');
        if (parts.length === 3) {
          surahWbwTranslation[`${parts[1]}:${parts[2]}`] = wbwTranslationData[key];
        }
      }
    }
  }

  // 6. Paginated loading: send first PAGE_SIZE (20) ayahs to the client
  const PAGE_SIZE = 20;
  const initialAyahs = combinedAyahs.slice(0, PAGE_SIZE);
  const allArabicTexts = localAyahs.map((a) => stripBismillahPrefix(a.text, surahNumber, a.numberInSurah));

  return (
    <SurahReaderClient
      surah={surahMetadata as any}
      initialAyahs={initialAyahs}
      totalAyahs={localAyahs.length}
      allArabicTexts={allArabicTexts}
      initialEdition={editionParam}
      surahWordsMap={{}}
      ayahParam={ayahParam}
      juzParam={juzParam}
      surahWbwTranslation={surahWbwTranslation}
      surahInfo={surahInfo}
    />
  );
}
