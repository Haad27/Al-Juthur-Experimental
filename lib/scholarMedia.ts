/**
 * lib/scholarMedia.ts
 *
 * Unified media infrastructure for Authentic Audio & Video Lecture Series
 * Supports:
 *  1. Dr. Israr Ahmed (Bayan-ul-Quran)
 *  2. Dr. Farhat Hashmi (Taleem-ul-Quran / Al-Huda)
 */

import israrAudioMapRaw from "./israrAudioMap.json";
import israrVideoMapRaw from "./israrVideoMap.json";
import farhatAudioMapRaw from "./farhatAudioMap.json";

export interface ScholarAudioPart {
  filename: string;
  url: string;
  label: string;
}

export type ScholarId = "israr" | "farhat";

export interface ScholarMedia {
  scholarId: ScholarId;
  scholarName: string;
  scholarTitle: string;
  seriesTitle: string;
  seriesSubtitle: string;
  portraitUrl: string;
  surahNumber: number;
  surahName: string;
  arabicName?: string;
  audioUrl: string;
  audioParts: ScholarAudioPart[];
  youtubeVideoId?: string;
  youtubeEmbedUrl: string;
  youtubeWatchUrl: string;
  youtubeSearchQuery: string;
  archiveBaseUrl: string;
}

const israrAudioMap = israrAudioMapRaw as Record<string, string[]>;
const israrVideoMap = israrVideoMapRaw as Record<string, string>;
const farhatAudioMap = farhatAudioMapRaw as Record<string, string[]>;

export const BAYAN_UL_QURAN_PLAYLIST_ID = "PLcWR-ibc7-PJzjJrSjXu7zTe7kWFPmDd5";
export const ISRAR_ARCHIVE_BASE = "https://archive.org/download/BayanUlQuranByDr.IsrarAhmed";
export const FARHAT_ARCHIVE_BASE = "https://archive.org/download/Quran-Urdu-Word-by-Word-Lafzi-Audio-by-Dr-Farhat-Hashmi";

function formatIsrarPartLabel(filename: string, index: number, totalParts: number): string {
  if (totalParts === 1) return "Full Lecture";
  const rangeMatch = filename.match(/[\(\[]([^\)\]]+)[\)\]]/);
  if (rangeMatch && rangeMatch[1]) {
    const range = rangeMatch[1].replace(/TO/gi, "–").trim();
    return `Part ${index + 1} (${range})`;
  }
  return `Part ${index + 1}`;
}

function formatFarhatPartLabel(filename: string, index: number, totalParts: number): string {
  if (totalParts === 1) return "Full Lecture";
  // Extract ayah range e.g. "Al-baqarah1-5Translation" or "1-7"
  const rangeMatch = filename.match(/(\d+[-–]\d+)/);
  if (rangeMatch && rangeMatch[1]) {
    return `Part ${index + 1} (Ayah ${rangeMatch[1]})`;
  }
  return `Part ${index + 1}`;
}

/**
 * Check if author matches Dr. Israr Ahmed
 */
export function isDrIsrarAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  if (authorId === 104 || authorId === 158 || authorId === 100158) return true;
  const combined = `${authorName || ""} ${name || ""}`.toLowerCase();
  return combined.includes("israr") || combined.includes("bayan-ul-quran") || combined.includes("بیان القرآن");
}

/**
 * Check if author matches Dr. Farhat Hashmi
 */
export function isDrFarhatAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  if (authorId === 160 || authorId === 100160) return true;
  const combined = `${authorName || ""} ${name || ""}`.toLowerCase();
  return combined.includes("farhat") || combined.includes("hashmi") || combined.includes("فرحت") || combined.includes("ہاشمی") || combined.includes("taleem-ul-quran") || combined.includes("al-huda");
}

/**
 * Check if author has an authentic multimedia audio & video lecture series
 */
export function isLectureAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  return isDrIsrarAuthor(authorId, authorName, name) || isDrFarhatAuthor(authorId, authorName, name);
}

/**
 * Get scholar identifier
 */
export function getScholarType(authorId?: number, authorName?: string, name?: string): "israr" | "farhat" | null {
  if (isDrIsrarAuthor(authorId, authorName, name)) return "israr";
  if (isDrFarhatAuthor(authorId, authorName, name)) return "farhat";
  return null;
}

/**
 * Get scholar media for a specific scholar and Surah
 */
export function getScholarMedia(
  scholarType: "israr" | "farhat",
  surahNumber: number,
  surahName: string,
  arabicName?: string
): ScholarMedia {
  const numStr = String(surahNumber);

  if (scholarType === "farhat") {
    const fileList = farhatAudioMap[numStr] || [];
    const audioParts: ScholarAudioPart[] = fileList.map((filename, idx) => ({
      filename,
      url: `${FARHAT_ARCHIVE_BASE}/${encodeURIComponent(filename)}`,
      label: formatFarhatPartLabel(filename, idx, fileList.length),
    }));

    const defaultFilename = fileList[0] || `P01-L001C Al-Fatihah 1-7 Translation.mp3`;
    const audioUrl = audioParts.length > 0
      ? audioParts[0].url
      : `${FARHAT_ARCHIVE_BASE}/${encodeURIComponent(defaultFilename)}`;

    const youtubeSearchQuery = `Dr Farhat Hashmi Surah ${surahName} Tafseer Taleem ul Quran`;
    const youtubeWatchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;
    // Clean embed search series query
    const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(youtubeSearchQuery)}&autoplay=1`;

    return {
      scholarId: "farhat",
      scholarName: "Dr. Farhat Hashmi",
      scholarTitle: "Al-Huda International",
      seriesTitle: "Taleem-ul-Quran (تعلیم القرآن)",
      seriesSubtitle: "Word-by-Word Urdu Translation & Tafseer Lecture Series",
      portraitUrl: "/images/dr-farhat-hashmi.jpg",
      surahNumber,
      surahName,
      arabicName,
      audioUrl,
      audioParts,
      youtubeEmbedUrl,
      youtubeWatchUrl,
      youtubeSearchQuery,
      archiveBaseUrl: FARHAT_ARCHIVE_BASE,
    };
  }

  // Default: Dr. Israr Ahmed
  const fileList = israrAudioMap[numStr] || [];
  const audioParts: ScholarAudioPart[] = fileList.map((filename, idx) => ({
    filename,
    url: `${ISRAR_ARCHIVE_BASE}/${encodeURIComponent(filename)}`,
    label: formatIsrarPartLabel(filename, idx, fileList.length),
  }));

  const defaultFilename = fileList[0] || `${String(surahNumber).padStart(3, "0")}.mp3`;
  const audioUrl = audioParts.length > 0
    ? audioParts[0].url
    : `${ISRAR_ARCHIVE_BASE}/${encodeURIComponent(defaultFilename)}`;

  const youtubeVideoId = israrVideoMap[numStr];
  const youtubeSearchQuery = `Dr Israr Ahmed Bayan ul Quran Surah ${surahName}`;

  const youtubeWatchUrl = youtubeVideoId
    ? `https://www.youtube.com/watch?v=${youtubeVideoId}&list=${BAYAN_UL_QURAN_PLAYLIST_ID}`
    : `https://www.youtube.com/playlist?list=${BAYAN_UL_QURAN_PLAYLIST_ID}`;

  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${BAYAN_UL_QURAN_PLAYLIST_ID}&autoplay=1`;

  return {
    scholarId: "israr",
    scholarName: "Dr. Israr Ahmed",
    scholarTitle: "Tanzeem-e-Islami",
    seriesTitle: "Bayan-ul-Quran (بیان القرآن)",
    seriesSubtitle: "Complete 114 Surah Original Audio & Video Tafseer Series",
    portraitUrl: "/images/dr-israr-ahmed.jpg",
    surahNumber,
    surahName,
    arabicName,
    audioUrl,
    audioParts,
    youtubeVideoId,
    youtubeEmbedUrl,
    youtubeWatchUrl,
    youtubeSearchQuery,
    archiveBaseUrl: ISRAR_ARCHIVE_BASE,
  };
}

// Backward-compatible alias for existing imports
export const getDrIsrarMedia = (surahNumber: number, surahName: string) =>
  getScholarMedia("israr", surahNumber, surahName);
