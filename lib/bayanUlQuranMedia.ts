/**
 * lib/bayanUlQuranMedia.ts
 *
 * Media mapping (Audio lectures from Tanzeem-e-Islami Bayan-ul-Quran archive
 * and complete 114 Surah-by-Surah YouTube playlist video embeds) for
 * Dr. Israr Ahmed's complete Bayan-ul-Quran.
 */

import israrAudioMapRaw from "./israrAudioMap.json";
import israrVideoMapRaw from "./israrVideoMap.json";

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
const israrVideoMap = israrVideoMapRaw as Record<string, string>;

export const BAYAN_UL_QURAN_PLAYLIST_ID = "PLcWR-ibc7-PJzjJrSjXu7zTe7kWFPmDd5";
const ARCHIVE_BASE_URL = "https://archive.org/download/BayanUlQuranByDr.IsrarAhmed";

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
 * Returns audio streaming URLs and complete YouTube playlist video embed parameters for Dr. Israr Ahmed
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

  // Video ID mapped from the complete 114 Surah-by-Surah YouTube playlist
  const youtubeVideoId = israrVideoMap[numStr];
  const youtubeSearchQuery = `Dr Israr Ahmed Bayan ul Quran Surah ${surahName}`;

  const youtubeWatchUrl = youtubeVideoId
    ? `https://www.youtube.com/watch?v=${youtubeVideoId}&list=${BAYAN_UL_QURAN_PLAYLIST_ID}`
    : `https://www.youtube.com/playlist?list=${BAYAN_UL_QURAN_PLAYLIST_ID}`;

  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${BAYAN_UL_QURAN_PLAYLIST_ID}&autoplay=1`;

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
