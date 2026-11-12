/**
 * lib/scholarMedia.ts
 *
 * Unified media infrastructure for Authentic Audio & Video Lecture Series
 * Supports:
 *  1. Dr. Israr Ahmed (Bayan-ul-Quran)
 *  2. Dr. Farhat Hashmi (Taleem-ul-Quran / Al-Huda)
 *  3. Ustadh Nouman Ali Khan (Bayyinah - Quran Series & Divine Speech)
 */

import israrAudioMapRaw from "./israrAudioMap.json";
import israrVideoMapRaw from "./israrVideoMap.json";
import farhatAudioMapRaw from "./farhatAudioMap.json";
import farhatVideoMapRaw from "./farhatVideoMap.json";
import noumanVideoMapRaw from "./noumanVideoMap.json";

export interface ScholarAudioPart {
  filename: string;
  url: string;
  label: string;
}

export type ScholarId = "israr" | "farhat" | "nouman";

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
  hasSpecificCoverage?: boolean;
}

const israrAudioMap = israrAudioMapRaw as Record<string, string[]>;
const israrVideoMap = israrVideoMapRaw as Record<string, string>;
const farhatAudioMap = farhatAudioMapRaw as Record<string, string[]>;
const farhatVideoMap = farhatVideoMapRaw as Record<
  string,
  {
    title: string;
    videoId?: string | null;
    playlistId?: string | null;
    hasSpecificCoverage?: boolean;
  }
>;
const noumanVideoMap = noumanVideoMapRaw as {
  divine_speech: {
    title: string;
    description: string;
    episodes: { title: string; videoId: string }[];
  };
  juz_amma_playlist: string;
  surahs: Record<string, { title: string; videoId: string; hasCoverage: boolean }>;
};

export const BAYAN_UL_QURAN_PLAYLIST_ID = "PLcWR-ibc7-PJzjJrSjXu7zTe7kWFPmDd5";
export const FARHAT_DEFAULT_PLAYLIST_ID = "PLgWtzr2mgrK2bPNdGq_90qfVFIfZPJTa9";
export const FARHAT_FALLBACK_VIDEO_ID = "wnI-BKTp_gM";
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
 * Check if author matches Ustadh Nouman Ali Khan
 */
export function isNoumanAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  if (authorId === 170 || authorId === 100170) return true;
  const combined = `${authorName || ""} ${name || ""}`.toLowerCase();
  return combined.includes("nouman") || combined.includes("bayyinah") || combined.includes("divine speech");
}

/**
 * Check if author has an authentic multimedia audio & video lecture series
 */
export function isLectureAuthor(authorId?: number, authorName?: string, name?: string): boolean {
  return isDrIsrarAuthor(authorId, authorName, name) || isDrFarhatAuthor(authorId, authorName, name) || isNoumanAuthor(authorId, authorName, name);
}

/**
 * Get scholar identifier
 */
export function getScholarType(authorId?: number, authorName?: string, name?: string): ScholarId | null {
  if (isDrIsrarAuthor(authorId, authorName, name)) return "israr";
  if (isDrFarhatAuthor(authorId, authorName, name)) return "farhat";
  if (isNoumanAuthor(authorId, authorName, name)) return "nouman";
  return null;
}

/**
 * Get scholar media for a specific scholar and Surah
 */
export function getScholarMedia(
  scholarType: ScholarId,
  surahNumber: number,
  surahName: string,
  arabicName?: string
): ScholarMedia {
  const numStr = String(surahNumber);

  if (scholarType === "nouman") {
    const surahData = noumanVideoMap.surahs[numStr];
    const isJuzAmma = surahNumber >= 78 && surahNumber <= 114;
    const hasSpecificCoverage = !!surahData?.hasCoverage;

    const youtubeVideoId = surahData?.videoId || undefined;
    const youtubeSearchQuery = `Nouman Ali Khan Surah ${surahName} Tafseer Bayyinah`;
    const youtubeWatchUrl = youtubeVideoId
      ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
      : isJuzAmma
      ? `https://www.youtube.com/playlist?list=${noumanVideoMap.juz_amma_playlist}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;

    const youtubeEmbedUrl = youtubeVideoId
      ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
      : isJuzAmma
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${noumanVideoMap.juz_amma_playlist}&autoplay=1`
      : `https://www.youtube-nocookie.com/embed/YR4B-3puOSw?autoplay=1&rel=0`;

    return {
      scholarId: "nouman",
      scholarName: "Ustadh Nouman Ali Khan",
      scholarTitle: "Bayyinah Institute",
      seriesTitle: "Quran Reflections & Divine Speech",
      seriesSubtitle: "Linguistic Miracles, Rhetoric & Thematic Coherence",
      portraitUrl: "/images/nouman-ali-khan.jpg",
      surahNumber,
      surahName,
      arabicName,
      audioUrl: "",
      audioParts: [],
      youtubeVideoId,
      youtubeEmbedUrl,
      youtubeWatchUrl,
      youtubeSearchQuery,
      archiveBaseUrl: "",
      hasSpecificCoverage: hasSpecificCoverage || isJuzAmma,
    };
  }

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

    const surahVideoData = farhatVideoMap[numStr];
    // Surah 3 (Aal-e-Imran) default to verified official lecture wnI-BKTp_gM (Ep: 78 / Lesson 1: 1-32)
    const youtubeVideoId = surahVideoData?.videoId || (numStr === "3" ? "wnI-BKTp_gM" : undefined);
    const playlistId = surahVideoData?.playlistId || (numStr === "3" ? "PLxP7htsLk9TZqB4h37Q3huqHcCkLRFijS" : undefined);
    const hasSpecificCoverage = !!(surahVideoData?.hasSpecificCoverage || youtubeVideoId || playlistId);

    const youtubeSearchQuery = `Dr Farhat Hashmi Surah ${surahName} Tafseer Taleem ul Quran`;

    const youtubeWatchUrl = youtubeVideoId && playlistId
      ? `https://www.youtube.com/watch?v=${youtubeVideoId}&list=${playlistId}`
      : youtubeVideoId
      ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
      : playlistId
      ? `https://www.youtube.com/playlist?list=${playlistId}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchQuery)}`;

    // Clean, direct YouTube embed (never use listType=search as it triggers "video unavailable")
    const youtubeEmbedUrl = youtubeVideoId
      ? `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`
      : playlistId
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1`
      : `https://www.youtube-nocookie.com/embed/${FARHAT_FALLBACK_VIDEO_ID}?autoplay=1&rel=0`;

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
      youtubeVideoId,
      youtubeEmbedUrl,
      youtubeWatchUrl,
      youtubeSearchQuery,
      archiveBaseUrl: FARHAT_ARCHIVE_BASE,
      hasSpecificCoverage,
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
    hasSpecificCoverage: true,
  };
}

// Backward-compatible alias for existing imports
export const getDrIsrarMedia = (surahNumber: number, surahName: string) =>
  getScholarMedia("israr", surahNumber, surahName);
