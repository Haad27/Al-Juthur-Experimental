import fs from 'fs';
import path from 'path';

export interface TranslationMeta {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
}

const globalForTranslations = globalThis as unknown as {
  manifestCache: TranslationMeta[] | null;
  translationCache: Record<string, any>;
};

if (!globalForTranslations.translationCache) {
  globalForTranslations.translationCache = {};
}

/**
 * Returns the list of all locally available translation editions
 */
export function getLocalTranslationsManifest(): TranslationMeta[] {
  if (!globalForTranslations.manifestCache) {
    try {
      const manifestPath = path.join(process.cwd(), 'database', 'translations', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const data = fs.readFileSync(manifestPath, 'utf-8');
        globalForTranslations.manifestCache = JSON.parse(data);
      } else {
        globalForTranslations.manifestCache = [];
      }
    } catch (e) {
      console.error("Failed to load local translations manifest:", e);
      globalForTranslations.manifestCache = [];
    }
  }
  return globalForTranslations.manifestCache || [];
}

/**
 * Loads a specific translation edition JSON from disk synchronously for a Surah
 */
export function getLocalSurahTranslation(surahNumber: number, edition: string = "en.sahih"): any[] {
  const cacheKey = `${edition}:${surahNumber}`;
  
  if (globalForTranslations.translationCache[cacheKey]) {
    return globalForTranslations.translationCache[cacheKey];
  }

  try {
    let filePath = path.join(process.cwd(), 'database', 'translations', `${edition}.json`);
    
    // Fallback to default en.sahih if file doesn't exist
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'database', 'en.sahih.json');
    }

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileData);
      
      const surahData = parsed?.data?.surahs?.find((s: any) => s.number === surahNumber) 
        || (parsed?.data?.number === surahNumber ? parsed?.data : null);

      const ayahs = surahData?.ayahs || [];
      globalForTranslations.translationCache[cacheKey] = ayahs;
      return ayahs;
    }
  } catch (e) {
    console.error(`Error loading local translation for ${edition} surah ${surahNumber}:`, e);
  }

  return [];
}
