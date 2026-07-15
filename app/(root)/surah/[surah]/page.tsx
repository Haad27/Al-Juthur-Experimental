import React from "react";
import SurahReaderClient from "@/components/quran/SurahReaderClient";
import { PrismaClient } from "@prisma/client";
import { getSurahWords } from "@/lib/lexicon/service";
import { SURAHS_DATA } from "@/lib/surahsData";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const removeDiacritics = (text: string) => {
  return text.replace(/[\u064B-\u065F\u0670]/g, ""); // removes harakat + dagger alif
};

// Singleton cache for the large JSON to avoid re-reading from disk constantly in Dev Mode
const globalForTranslation = globalThis as unknown as {
  sahihTranslationCache: any | undefined;
};

function getSahihTranslation() {
  if (!globalForTranslation.sahihTranslationCache) {
    try {
      const filePath = path.join(process.cwd(), 'database', 'en.sahih.json');
      const fileData = fs.readFileSync(filePath, 'utf8');
      globalForTranslation.sahihTranslationCache = JSON.parse(fileData);
    } catch (e) {
      console.error("Could not load local Sahih translation:", e);
      globalForTranslation.sahihTranslationCache = null;
    }
  }
  return globalForTranslation.sahihTranslationCache;
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

  const surahNumber = Number(resolvedParams.surah);
  const ayahParam = typeof resolvedSearchParams.ayah === "string" ? resolvedSearchParams.ayah : null;
  const juzParam = typeof resolvedSearchParams.juz === "string" ? resolvedSearchParams.juz : null;

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

  // 2. Fetch Arabic Ayahs from our massive local Prisma DB
  const localAyahs = await prisma.ayah.findMany({
    where: { surahId: surahNumber },
    orderBy: { numberInSurah: "asc" }
  });

  // 3. Fetch pure English translation (Sahih International) from local JSON file
  const translationData = getSahihTranslation();
  const surahTranslation = translationData?.data?.surahs?.find(
    (s: any) => s.number === surahNumber
  );

  // 4. Fetch morphological mapping from our Lexicon service
  const surahWordsMap = getSurahWords(surahNumber);

  // 5. Merge the local Arabic with the pure English translation
  const combinedAyahs = localAyahs.map((localAyah) => {
    const translated = surahTranslation?.ayahs?.find(
      (t: any) => t.numberInSurah === localAyah.numberInSurah
    );
    return {
      number: localAyah.id,
      numberInSurah: localAyah.numberInSurah,
      text: localAyah.text,
      cleanText: removeDiacritics(localAyah.text),
      translation: translated?.text || "Translation missing.",
    };
  });

  return (
    <SurahReaderClient
      surah={surahMetadata}
      ayahs={combinedAyahs}
      surahWordsMap={surahWordsMap}
      ayahParam={ayahParam}
      juzParam={juzParam}
    />
  );
}
