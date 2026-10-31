/**
 * lib/bayanUlQuranMedia.ts
 * 
 * Media mapping (Audio lectures and YouTube video IDs) for
 * Dr. Israr Ahmed's Bayan-ul-Quran (108/114 Surah lectures).
 */

export interface DrIsrarMedia {
  surahNumber: number;
  surahName: string;
  audioUrl: string;
  youtubeVideoId?: string;
  youtubeSearchQuery: string;
}

// Map of major Surah YouTube video IDs for Dr. Israr Ahmed Bayan-ul-Quran
export const DR_ISRAR_YOUTUBE_MAP: Record<number, string> = {
  1: "vNrTPrkVQmw", // Surah Al-Fatihah
  2: "o_RHhqjl9Nc", // Surah Al-Baqarah (Ruku 1-4)
  3: "AUZIYQEx_Yz", // Surah Ali 'Imran
  18: "AUZIYQEddtt", // Surah Al-Kahf
  36: "AUZIYQG7dyd", // Surah Ya-Sin
  55: "AUZIYQFRFKd", // Surah Ar-Rahman
  67: "AUZIYQH87ms", // Surah Al-Mulk
  112: "AUZIYQG1FU8", // Surah Al-Ikhlas
  113: "AUZIYQFrkKQ", // Surah Al-Falaq
  114: "AUZIYQGVwh7", // Surah An-Nas
};

/**
 * Returns audio streaming URL and YouTube embed/search parameters for Dr. Israr Ahmed
 */
export function getDrIsrarMedia(surahNumber: number, surahName: string): DrIsrarMedia {
  const padded = String(surahNumber).padStart(3, "0");
  
  // High quality streaming audio archive of Bayan-ul-Quran (Tanzeem-e-Islami / QuranicAudio)
  const audioUrl = `https://download.quranicaudio.com/quran/urdu_bayan_ul_quran_israr/${padded}.mp3`;
  
  // Specific mapped YouTube video or search embed
  const youtubeVideoId = DR_ISRAR_YOUTUBE_MAP[surahNumber];
  const youtubeSearchQuery = `Dr Israr Ahmed Bayan ul Quran Surah ${surahName}`;

  return {
    surahNumber,
    surahName,
    audioUrl,
    youtubeVideoId,
    youtubeSearchQuery,
  };
}

/**
 * Checks if the given author is Dr. Israr Ahmed (Bayan-ul-Quran)
 */
export function isDrIsrarAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  if (authorId === 104 || authorId === 158 || authorId === 100158) return true;
  const combined = `${authorName || ""} ${name || ""}`.toLowerCase();
  return combined.includes("israr") || combined.includes("bayan-ul-quran") || combined.includes("بیان القرآن");
}
