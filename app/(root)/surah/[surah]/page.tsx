import React from "react";
import SurahReaderClient from "@/components/quran/SurahReaderClient";
import prisma from "@/lib/prisma";
import { getSurahWords } from "@/lib/lexicon/service";
import { SURAHS_DATA } from "@/lib/surahsData";
import { getQuranComSurahTranslation } from "@/lib/translations";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { stripBismillahPrefix } from "@/lib/utils";
import { unstable_cache } from "next/cache";

// ISR: Build and cache this page at the CDN edge, revalidate every 24 hours.
// First visitor after deployment builds the page; all subsequent visitors get
// the cached version in <50ms from Vercel's global CDN edge network.
export const revalidate = 86400;

const removeDiacritics = (text: string) => {
  return text.replace(/[\u064B-\u065F\u0670]/g, ""); // removes harakat + dagger alif
};

// Persistent cache for Ayahs — survives Vercel cold starts unlike globalThis.
// Quran text is 1400 years old, so we cache it for 30 days.
const getAyahsForSurah = unstable_cache(
  async (surahNumber: number) => {
    return await prisma.ayah.findMany({
      where: { surahId: surahNumber },
      orderBy: { numberInSurah: "asc" }
    });
  },
  ["surah-ayahs"],
  { revalidate: 2592000 } // 30 days
);

// Persistent cache for WBW translation JSON — cached for 30 days.
const getWbwTranslation = unstable_cache(
  async (): Promise<Record<string, string>> => {
    try {
      const filePath = path.join(process.cwd(), 'database', 'word-by-word-translation', 'english-wbw-translation.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileData);
    } catch (e) {
      console.error("Could not load local WBW translation:", e);
      return {};
    }
  },
  ['wbw-translation-data'],
  { revalidate: 2592000 } // 30 days — static file
);

export default async function SurahPage({
  params,
  searchParams,
}: {
  params: Promise<{ surah: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();

  const surahNumber = Number(resolvedParams.surah);
  
  // Load Surah Context metadata
  let surahInfo = null;
  try {
    const surahInfoPath = path.join(process.cwd(), "database", "surah-meta", "surah-info-en.json");
    if (fs.existsSync(surahInfoPath)) {
      const allSurahInfo = JSON.parse(fs.readFileSync(surahInfoPath, "utf-8"));
      surahInfo = allSurahInfo[surahNumber] || null;
    }
  } catch (e) {
    console.error("Error loading surah info:", e);
  }

  const ayahParam = typeof resolvedSearchParams.ayah === "string" ? resolvedSearchParams.ayah : null;
  const juzParam = typeof resolvedSearchParams.juz === "string" ? resolvedSearchParams.juz : null;
  
  // Determine selected translation edition from URL query or cookie
  const editionParam = typeof resolvedSearchParams.trans === "string" 
    ? resolvedSearchParams.trans 
    : cookieStore.get("trans")?.value || "en.sahih";

  if (!surahNumber || isNaN(surahNumber)) {
    return <div className="p-8 text-center text-white">Invalid Surah</div>;
  }

  // 1. Fetch Surah metadata directly from local SURAHS_DATA memory or DB
  const surahMetadata = SURAHS_DATA.find(s => s.number === surahNumber) || await prisma.surah.findUnique({
    where: { id: surahNumber }
  });
  
  if (surahMetadata) {
    (surahMetadata as any).number = (surahMetadata as any).number || (surahMetadata as any).id;
  }

  // 2. Fetch Arabic Ayahs from our massive local Prisma DB (cached in memory after first load)
  const localAyahs = await getAyahsForSurah(surahNumber);

  // 3. Fetch selected translation from Quran.com API (or local fallback)
  const translationAyahs = await getQuranComSurahTranslation(surahNumber, editionParam);

  // 4. Fetch morphological mapping from our Lexicon service
  const surahWordsMap = await getSurahWords(surahNumber);

  // Pre-compute O(1) lookup map for translations
  const translationMap = new Map<number, string>();
  const footnoteMap = new Map<number, string[]>();
  
  translationAyahs.forEach((t, index) => {
    let cleanText = "";
    const fIds: string[] = [];
    
    if (typeof t.text === "string") {
      let fIdsCount = 0;
      cleanText = t.text.replace(/<sup foot_note=["']?(\d+)["']?>.*?<\/sup>/gi, (match: string, id: string) => {
        fIds.push(id);
        fIdsCount++;
        return `<span class="text-emerald-500 font-bold mx-1">[${fIdsCount}]</span>`;
      });
      // Fallback for any other HTML tags
      cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/gi, "");
    } else {
      cleanText = t.text || "";
    }
    
    const verseNum = t.verse_number || t.numberInSurah || (index + 1);
    translationMap.set(verseNum, cleanText);
    footnoteMap.set(verseNum, fIds);
  });

  // 5. Merge the local Arabic with the pure English translation
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

  // 6. Generate word-by-word translation map for this Surah
  const wbwTranslationData = await getWbwTranslation();
  const surahWbwTranslation: Record<string, string> = {}; // key: "ayahNumber:wordIndex" -> translation
  
  for (const ayah of localAyahs) {
    const ayahNo = ayah.numberInSurah;
    const wordCount = ayah.text.split(/\s+/).length;
    // Map up to wordCount + 5 to be absolutely safe for any index
    for (let wIdx = 1; wIdx <= wordCount + 5; wIdx++) {
      const key = `${surahNumber}:${ayahNo}:${wIdx}`;
      if (wbwTranslationData && wbwTranslationData[key]) {
        surahWbwTranslation[`${ayahNo}:${wIdx}`] = wbwTranslationData[key];
      }
    }
  }

  // 7. Paginated loading: only send first PAGE_SIZE ayahs to the client.
  //    The client fetches subsequent pages on demand via /api/ayahs.
  //    We also send all Arabic texts (lightweight strings) so the client can
  //    compute accurate skeleton heights for every unloaded ayah.
  const PAGE_SIZE = 20;
  const initialAyahs = combinedAyahs.slice(0, PAGE_SIZE);
  const allArabicTexts = localAyahs.map((a) => stripBismillahPrefix(a.text, surahNumber, a.numberInSurah));

  return (
    <SurahReaderClient
      surah={surahMetadata}
      initialAyahs={initialAyahs}
      totalAyahs={localAyahs.length}
      allArabicTexts={allArabicTexts}
      initialEdition={editionParam}
      surahWordsMap={surahWordsMap}
      ayahParam={ayahParam}
      juzParam={juzParam}
      surahWbwTranslation={surahWbwTranslation}
      surahInfo={surahInfo}
    />
  );
}
