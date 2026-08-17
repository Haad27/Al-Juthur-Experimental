import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getQuranComSurahTranslation } from "@/lib/translations";
import { stripBismillahPrefix } from "@/lib/utils";
import { unstable_cache } from "next/cache";

const removeDiacritics = (text: string) =>
  text.replace(/[\u064B-\u065F\u0670]/g, "");

// Persistent cross-invocation cache using Next.js built-in cache.
// Unlike globalThis, this survives Vercel serverless cold starts.
const getAyahsForSurah = unstable_cache(
  async (surahNumber: number) => {
    return await prisma.ayah.findMany({
      where: { surahId: surahNumber },
      orderBy: { numberInSurah: "asc" },
    });
  },
  ["ayahs-for-surah"],
  { revalidate: 2592000 } // 30 days — the Quran text does not change
);

const getTranslationMaps = unstable_cache(
  async (surahNumber: number, edition: string) => {
    const translationAyahs = await getQuranComSurahTranslation(surahNumber, edition);
    const translationMap: Record<number, string> = {};
    const footnoteMap: Record<number, string[]> = {};

    translationAyahs.forEach((t: any, index: number) => {
      const fIds: string[] = [];
      let cleanText = "";
      if (typeof t.text === "string") {
        let fIdsCount = 0;
        // Match any <sup ...>, <a ...> containing footnote identifiers
        cleanText = t.text.replace(
          /<(?:sup|a|span)\b[^>]*(?:foot_note|footnote_id|footnote-id|footnote|data-foot_note|data-footnote)=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/(?:sup|a|span)>/gi,
          (_match: string, id: string) => {
            fIds.push(id);
            fIdsCount++;
            return `<span class="text-emerald-500 font-bold mx-1 cursor-pointer footnote-ref" data-findex="${fIdsCount}" data-fid="${id}">[${fIdsCount}]</span>`;
          }
        );
        // Strip any other lingering sup tags without footnote id
        cleanText = cleanText.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, "$1");
      } else {
        cleanText = t.text || "";
      }
      const verseNum = t.verse_number || t.numberInSurah || index + 1;
      translationMap[verseNum] = cleanText;
      footnoteMap[verseNum] = fIds;
    });

    return { translationMap, footnoteMap };
  },
  ["translation-maps"],
  { revalidate: 86400 } // 24 hours — translation files are static
);

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
        translation: translationMap[localAyah.numberInSurah] || "Translation missing.",
        footnoteIds: footnoteMap[localAyah.numberInSurah] || [],
      };
    });

    // Cache for 30 days at the CDN edge — Quran text + translations are immutable
    return NextResponse.json(
      { ayahs },
      {
        headers: {
          "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/ayahs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
