import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { unstable_cache } from "next/cache";

const getSurahInfoMap = unstable_cache(
  async (): Promise<Record<string, any>> => {
    try {
      const surahInfoPath = path.join(process.cwd(), "database", "surah-meta", "surah-info-en.json");
      if (fs.existsSync(surahInfoPath)) {
        return JSON.parse(fs.readFileSync(surahInfoPath, "utf-8"));
      }
      return require("@/database/surah-meta/surah-info-en.json");
    } catch (e) {
      try {
        return require("@/database/surah-meta/surah-info-en.json");
      } catch (err) {
        console.error("Error loading surah info in API:", err);
        return {};
      }
    }
  },
  ["surah-info-api-v1"],
  { revalidate: 2592000 } // 30 days
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surahId = searchParams.get("surahId") || searchParams.get("surah");

  try {
    const allInfo = await getSurahInfoMap();

    if (surahId) {
      const idNum = parseInt(surahId, 10);
      const info = allInfo[idNum] || allInfo[String(idNum)] || null;
      if (!info) {
        return NextResponse.json({ success: false, error: "Surah info not found" }, { status: 404 });
      }
      return NextResponse.json(
        { success: true, data: info },
        {
          headers: {
            "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
          },
        }
      );
    }

    return NextResponse.json(
      { success: true, data: allInfo },
      {
        headers: {
          "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Surah Info API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
