import fs from 'fs';
import path from 'path';

export interface TranslationMeta {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
}

// In-memory cache for bundled translations to avoid repeatedly reading or parsing JSON files
let cached131Data: Record<string, any[]> | null = null;
let cached20Data: Record<string, any[]> | null = null;
let quranpediaClearQuranCache: Record<number, any[]> | null = null;

function getBundledTranslation(id: string, surahNumber: number): any[] | null {
  const surahKey = String(surahNumber);

  if (id === "131") {
    if (!cached131Data) {
      try {
        cached131Data = require('@/database/translations/131.json');
      } catch {
        try {
          const filePath = path.join(process.cwd(), 'database', 'translations', '131.json');
          if (fs.existsSync(filePath)) {
            cached131Data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          }
        } catch (e) {
          console.error("Could not load local 131.json translation:", e);
        }
      }
    }
    if (cached131Data && (cached131Data[surahNumber] || cached131Data[surahKey])) {
      return cached131Data[surahNumber] || cached131Data[surahKey];
    }
  }

  if (id === "20") {
    if (!cached20Data) {
      try {
        cached20Data = require('@/database/translations/20.json');
      } catch {
        try {
          const filePath = path.join(process.cwd(), 'database', 'translations', '20.json');
          if (fs.existsSync(filePath)) {
            cached20Data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          }
        } catch (e) {
          console.error("Could not load local 20.json translation:", e);
        }
      }
    }
    if (cached20Data && (cached20Data[surahNumber] || cached20Data[surahKey])) {
      return cached20Data[surahNumber] || cached20Data[surahKey];
    }
  }

  // Any other local translation if present
  try {
    const filePath = path.join(process.cwd(), 'database', 'translations', `${id}.json`);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const allSurahs = JSON.parse(fileData);
      return allSurahs[surahNumber] || allSurahs[surahKey] || null;
    }
  } catch {}

  return null;
}

/**
 * Online fallback API for The Clear Quran (Dr. Mustafa Khattab)
 * Used if bundled data is unavailable in any environment.
 */
async function fetchClearQuranFromQuranpedia(surahNumber: number): Promise<any[]> {
  try {
    if (!quranpediaClearQuranCache) {
      const res = await fetch("https://quranpedia.net/translation-books/13661.json", {
        next: { revalidate: 2592000 } // Cache for 30 days
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ayahs)) {
          const map: Record<number, any[]> = {};
          data.ayahs.forEach((item: any) => {
            const sNum = item.surah_number;
            if (!map[sNum]) map[sNum] = [];
            const cleanText = (item.translated_text || "")
              .replace(/<[^>]*>?/gm, "")
              .trim();
            map[sNum].push({
              resource_id: 131,
              verse_number: item.ayah_number,
              text: cleanText,
            });
          });
          quranpediaClearQuranCache = map;
        }
      }
    }
    if (quranpediaClearQuranCache && quranpediaClearQuranCache[surahNumber]) {
      return quranpediaClearQuranCache[surahNumber];
    }
  } catch (e) {
    console.error("Failed to fetch Clear Quran from online fallback API:", e);
  }
  return [];
}

/**
 * Retrieves the translation verses for a given Surah.
 * Supports Dr. Mustafa Khattab's Clear Quran (131), Saheeh International (20),
 * and all other Quran.com API v4 translations.
 */
export async function getQuranComSurahTranslation(surahNumber: number, edition: string | number = "203"): Promise<any[]> {
  // Map legacy editions to Quran.com Resource IDs
  const legacyMap: Record<string, string> = {
    "en.sahih": "20",
    "en.clearquran": "131",
    "en.khattab": "131",
    "en.haleem": "85",
    "ur.jalandhry": "54",
    "ur.maududi": "234",
    "de.bubenheim": "27",
    "ru.kuliev": "77",
    "fr.hamidullah": "31"
  };

  const id = legacyMap[String(edition)] || String(edition);

  // 1. First priority: check bundled translation (131 Clear Quran or 20 Saheeh or local file)
  const bundled = getBundledTranslation(id, surahNumber);
  if (bundled && bundled.length > 0) {
    return bundled;
  }

  // 2. Clear Quran fallback API (since Quran.com removed resource 131)
  if (id === "131") {
    const onlineKhattab = await fetchClearQuranFromQuranpedia(surahNumber);
    if (onlineKhattab && onlineKhattab.length > 0) {
      return onlineKhattab;
    }
  }

  // 3. For all other editions, fetch from Quran.com API v4
  try {
    const res = await fetch(`https://api.quran.com/api/v4/quran/translations/${id}?chapter_number=${surahNumber}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.translations && data.translations.length > 0) {
        return data.translations;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch translation ${id} from Quran.com API:`, e);
  }

  // 4. Reliable safety fallback to Saheeh International (20) if any translation fails
  const fallback20 = getBundledTranslation("20", surahNumber);
  if (fallback20 && fallback20.length > 0) {
    return fallback20;
  }

  return [];
}
