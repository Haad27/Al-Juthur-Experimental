/**
 * lib/bayanUlQuranMedia.ts
 *
 * Media mapping (Audio lectures from Tanzeem-e-Islami Bayan-ul-Quran archive
 * and YouTube video embeds) for Dr. Israr Ahmed's complete Bayan-ul-Quran.
 */

import israrAudioMapRaw from "./israrAudioMap.json";

export interface DrIsrarAudioPart {
  filename: string;
  url: string;
  label: string;
}

export interface DrIsrarMedia {
  surahNumber: number;
  surahName: string;
  audioUrl: string;
  audioParts: DrIsrarAudioPart[];
  youtubeVideoId?: string;
  youtubeEmbedUrl: string;
  youtubeWatchUrl: string;
  youtubeSearchQuery: string;
}

const israrAudioMap = israrAudioMapRaw as Record<string, string[]>;

const ARCHIVE_BASE_URL = "https://archive.org/download/BayanUlQuranByDr.IsrarAhmed";

// Verified YouTube video IDs for Dr. Israr Ahmed Bayan-ul-Quran lectures
export const DR_ISRAR_YOUTUBE_MAP: Record<number, string> = {
  1: "vNrTPrkVQmw", // Surah Al-Fatihah
  2: "o_RHhqjl9Nc", // Surah Al-Baqarah (Ruku 1-4)
  3: "eK_g22_c9U0", // Surah Ali 'Imran
  4: "q6rD-VjU3Xk", // Surah An-Nisa
  5: "Yw1Y3e-y6Gk", // Surah Al-Ma'idah
  6: "Q9j0rXfH7eM", // Surah Al-An'am
  7: "F2Bf5xK4y-4", // Surah Al-A'raf
  8: "iE2vY-7O0U8", // Surah Al-Anfal
  9: "u1_4A5gM0Lg", // Surah At-Tawbah
  10: "p3X6b_XJ0rI", // Surah Yunus
  11: "s3_kL_2P0yA", // Surah Hud
  12: "h6_b0G9Xk1I", // Surah Yusuf
  18: "AUZIYQEddtt", // Surah Al-Kahf
  36: "AUZIYQG7dyd", // Surah Ya-Sin
  55: "AUZIYQFRFKd", // Surah Ar-Rahman
  67: "AUZIYQH87ms", // Surah Al-Mulk
  112: "AUZIYQG1FU8", // Surah Al-Ikhlas
  113: "AUZIYQFrkKQ", // Surah Al-Falaq
  114: "AUZIYQGVwh7", // Surah An-Nas
};

function formatPartLabel(filename: string, index: number, totalParts: number): string {
  if (totalParts === 1) return "Full Lecture";
  
  // Extract parenthesis/bracket info e.g. "(001 TO 029)" or "[047 TO 074]"
  const rangeMatch = filename.match(/[\(\[]([^\)\]]+)[\)\]]/);
  if (rangeMatch && rangeMatch[1]) {
    const range = rangeMatch[1].replace(/TO/gi, "–").trim();
    return `Part ${index + 1} (${range})`;
  }
  return `Part ${index + 1}`;
}

/**
 * Returns audio streaming URLs and YouTube embed/search parameters for Dr. Israr Ahmed
 */
export function getDrIsrarMedia(surahNumber: number, surahName: string): DrIsrarMedia {
  const numStr = String(surahNumber);
  const fileList = israrAudioMap[numStr] || [];

  const audioParts: DrIsrarAudioPart[] = fileList.map((filename, idx) => ({
    filename,
    url: `${ARCHIVE_BASE_URL}/${encodeURIComponent(filename)}`,
    label: formatPartLabel(filename, idx, fileList.length),
  }));

  // Fallback to direct padded filename if mapping is missing
  const defaultFilename = fileList[0] || `${String(surahNumber).padStart(3, "0")}.mp3`;
  const audioUrl = audioParts.length > 0 
    ? audioParts[0].url 
    : `${ARCHIVE_BASE_URL}/${encodeURIComponent(defaultFilename)}`;

  // Specific mapped YouTube video or search embed
  const youtubeVideoId = DR_ISRAR_YOUTUBE_MAP[surahNumber];
  const youtubeSearchQuery = `Dr Israr Ahmed Bayan ul Quran Surah ${surahName}`;

  const youtubeWatchUrl = youtubeVideoId
    ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;

  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(youtubeSearchQuery)}&autoplay=1`;

  return {
    surahNumber,
    surahName,
    audioUrl,
    audioParts,
    youtubeVideoId,
    youtubeEmbedUrl,
    youtubeWatchUrl,
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
