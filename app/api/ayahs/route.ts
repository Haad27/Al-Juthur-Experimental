import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getQuranComSurahTranslation } from "@/lib/translations";
import { stripBismillahPrefix } from "@/lib/utils";

const removeDiacritics = (text: string) =>
  text.replace(/[\u064B-\u065F\u0670]/g, "");

// Re-use the same global singleton cache as page.tsx so ayahs are never
// fetched from DB more than once per server lifetime.
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
  const ayahs = await prisma.ayah.findMany({
    where: { surahId: surahNumber },
    orderBy: { numberInSurah: "asc" },
  });
  globalForAyahs.surahAyahsCache[surahNumber] = ayahs;
  return ayahs;
}

// Cache translations per surah+edition so the same JSON isn't re-read on
// every paginated request.
const globalForTranslations = globalThis as unknown as {
  translationCache: Record<string, { translationMap: Map<number, string>; footnoteMap: Map<number, string[]> }> | undefined;
};

async function getTranslationMaps(surahNumber: number, edition: string) {
  if (!globalForTranslations.translationCache) {
    globalForTranslations.translationCache = {};
  }
  const key = `${surahNumber}:${edition}`;
  if (globalForTranslations.translationCache[key]) {
    return globalForTranslations.translationCache[key];
  }

  const translationAyahs = await getQuranComSurahTranslation(surahNumber, edition);
  const translationMap = new Map<number, string>();
  const footnoteMap = new Map<number, string[]>();

  translationAyahs.forEach((t: any, index: number) => {
    const fIds: string[] = [];
    let cleanText = "";
    if (typeof t.text === "string") {
      let fIdsCount = 0;
      cleanText = t.text.replace(
        /<sup foot_note=["']?(\d+)["']?>.*?<\/sup>/gi,
        (_match: string, id: string) => {
          fIds.push(id);
          fIdsCount++;
          return `<span class="text-emerald-500 font-bold mx-1">[${fIdsCount}]</span>`;
        }
      );
      cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/gi, "");
    } else {
      cleanText = t.text || "";
    }
    const verseNum = t.verse_number || t.numberInSurah || index + 1;
    translationMap.set(verseNum, cleanText);
    footnoteMap.set(verseNum, fIds);
  });

  const result = { translationMap, footnoteMap };
  globalForTranslations.translationCache[key] = result;
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const surahNumber = Number(searchParams.get("surah"));
  const start = Number(searchParams.get("start") || "1"); // 1-based ayah number
  const count = Number(searchParams.get("count") || "20");
  const edition = searchParams.get("edition") || "20";

  if (!surahNumber || isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ error: "Invalid surah number" }, { status: 400 });
  }

  try {
    const [allAyahs, { translationMap, footnoteMap }] = await Promise.all([
      getAyahsForSurah(surahNumber),
      getTranslationMaps(surahNumber, edition),
    ]);

    // Slice the requested page (start is 1-based)
    const sliced = allAyahs.slice(start - 1, start - 1 + count);

    const ayahs = sliced.map((localAyah: any) => {
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

    return NextResponse.json({ ayahs });
  } catch (error) {
    console.error("Error in /api/ayahs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
