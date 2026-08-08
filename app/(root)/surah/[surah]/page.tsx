import React from "react";
import SurahReaderClient from "@/components/quran/SurahReaderClient";
import prisma from "@/lib/prisma";
import { getSurahWords } from "@/lib/lexicon/service";
import { SURAHS_DATA } from "@/lib/surahsData";
import { getQuranComSurahTranslation } from "@/lib/translations";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const removeDiacritics = (text: string) => {
  return text.replace(/[\u064B-\u065F\u0670]/g, ""); // removes harakat + dagger alif
};

// Singleton cache for Ayahs
const globalForAyahs = globalThis as unknown as {
  surahAyahsCache: Record<number, any[]> | undefined;
};

async function getAyahsForSurah(surahNumber: number) {
  if (!globalForAyahs.surahAyahsCache) {
    globalForAyahs.surahAyahsCache = {};
  }
  if (globalForAyahs.surahAyahsCache[surahNumber]) {
    return globalForAyahs.surahAyahsCache[surahNumber];
  }
  const localAyahs = await prisma.ayah.findMany({
    where: { surahId: surahNumber },
    orderBy: { numberInSurah: "asc" }
  });
  globalForAyahs.surahAyahsCache[surahNumber] = localAyahs;
  return localAyahs;
}

// Singleton cache for WBW JSON
const globalForTranslation = globalThis as unknown as {
  wbwTranslationCache: Record<string, string> | undefined;
};

function getWbwTranslation() {
  if (!globalForTranslation.wbwTranslationCache) {
    try {
      const filePath = path.join(process.cwd(), 'database', 'word-by-word-translation', 'english-wbw-translation.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      globalForTranslation.wbwTranslationCache = JSON.parse(fileData);
    } catch (e) {
      console.error("Could not load local WBW translation:", e);
      globalForTranslation.wbwTranslationCache = {};
    }
  }
  return globalForTranslation.wbwTranslationCache;
}

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
  const surahWordsMap = getSurahWords(surahNumber);

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
    let rawText = localAyah.text;
    if (localAyah.numberInSurah === 1 && surahNumber !== 1 && surahNumber !== 9) {
      rawText = rawText
        .replace(/^[\uFEFF]?بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\s*/, "")
        .replace(/^[\uFEFF]?بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, "")
        .replace(/^[\uFEFF]?بِسْمِ اللهِ الرَّحْمَـٰنِ الرَّحِيمِ\s*/, "")
        .replace(/^[\uFEFF]?بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ\s*/, "")
        .trim();
    }
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
  const wbwTranslationData = getWbwTranslation();
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

  return (
    <SurahReaderClient
      surah={surahMetadata}
      ayahs={combinedAyahs}
      surahWordsMap={surahWordsMap}
      ayahParam={ayahParam}
      juzParam={juzParam}
      surahWbwTranslation={surahWbwTranslation}
      surahInfo={surahInfo}
    />
  );
}
