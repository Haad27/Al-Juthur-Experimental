import fs from 'fs';
import path from 'path';

export interface TranslationMeta {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
}

/**
 * Retrieves the translation verses for a given Surah from Quran.com API v4,
 * and falls back to a local Clear Quran (131) translation on failure.
 */
export async function getQuranComSurahTranslation(surahNumber: number, edition: string | number = "131"): Promise<any[]> {
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
  
  // Intercept 131 (The Clear Quran) and load from local downloaded file
  if (id === "131") {
    try {
      const filePath = path.join(process.cwd(), 'database', 'translations', '131.json');
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const allSurahs = JSON.parse(fileData);
        return allSurahs[surahNumber] || [];
      }
    } catch (e) {
      console.error("Failed to load local fallback translation for 131", e);
    }
    return [];
  }
  
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
    console.error("Failed to fetch translation from Quran.com API", e);
  }

  // Fallback to local 20.json (Saheeh International) if API fails or offline
  try {
    const filePath = path.join(process.cwd(), 'database', 'translations', '20.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const allSurahs = JSON.parse(fileData);
      return allSurahs[surahNumber] || [];
    }
  } catch (e) {
    console.error("Failed to load local fallback translation", e);
  }
  
  return [];
}
