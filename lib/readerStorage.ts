export interface LastReadTafsir {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  authorId: number;
  authorName: string;
  langName: string;
  timestamp: number;
}

export interface SavedTafsirItem {
  id: string; // unique key e.g. "auth_surah_ayah"
  surahId: number;
  surahName: string;
  ayahNumber: number;
  authorId: number;
  authorName: string;
  langName: string;
  arabicText?: string;
  tafsirSnippet: string;
  fullTafsirText?: string;
  timestamp: number;
  pinned?: boolean;
}

export interface SavedScholarAnswer {
  id: string; // unique timestamp / uuid
  question: string;
  answer: string;
  modeName?: string;
  surahNumber?: number;
  ayahNumber?: number;
  rootWord?: string;
  sources?: Array<{
    book: string;
    authorName: string;
    snippet: string;
  }>;
  timestamp: number;
  pinned?: boolean;
}

export interface ReadingHistoryItem {
  surahId: number;
  surahName: string;
  ayahNumber: number;
  authorName: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  LAST_READ: "aljuthur-tafsir-last-read",
  SAVED_TAFSIRS: "saved-tafsirs",
  SAVED_SCHOLAR_ANSWERS: "saved-scholar-answers",
  READING_HISTORY: "aljuthur-reading-history",
};

// -------------------------------------------------------------
// 1. Last Read Tracking
// -------------------------------------------------------------
export function getLastReadTafsir(): LastReadTafsir | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_READ);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Error reading last read tafsir:", e);
    return null;
  }
}

export function setLastReadTafsir(item: LastReadTafsir): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify(item));
    // Also record in recent reading history
    recordReadingHistory({
      surahId: item.surahId,
      surahName: item.surahName,
      ayahNumber: item.ayahNumber,
      authorName: item.authorName,
      timestamp: item.timestamp,
    });
  } catch (e) {
    console.error("Error saving last read tafsir:", e);
  }
}

// -------------------------------------------------------------
// 2. Saved Tafsirs
// -------------------------------------------------------------
export function getSavedTafsirs(): SavedTafsirItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVED_TAFSIRS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error fetching saved tafsirs:", e);
    return [];
  }
}

export function saveTafsirItem(item: SavedTafsirItem): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getSavedTafsirs();
    const existingIndex = current.findIndex((t) => t.id === item.id);
    let updated: SavedTafsirItem[];
    if (existingIndex >= 0) {
      // Toggle or remove
      updated = current.filter((t) => t.id !== item.id);
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_TAFSIRS, JSON.stringify(updated));
    return existingIndex < 0; // returns true if newly saved, false if removed
  } catch (e) {
    console.error("Error saving tafsir item:", e);
    return false;
  }
}

export function removeSavedTafsir(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedTafsirs();
    const updated = current.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_TAFSIRS, JSON.stringify(updated));
  } catch (e) {
    console.error("Error removing saved tafsir:", e);
  }
}

export function togglePinSavedTafsir(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedTafsirs();
    const updated = current.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t));
    localStorage.setItem(STORAGE_KEYS.SAVED_TAFSIRS, JSON.stringify(updated));
  } catch (e) {
    console.error("Error pinning saved tafsir:", e);
  }
}

export function isTafsirSaved(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getSavedTafsirs();
    return current.some((t) => t.id === id);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 3. Saved AI Scholar Answers
// -------------------------------------------------------------
export function getSavedScholarAnswers(): SavedScholarAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVED_SCHOLAR_ANSWERS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error fetching saved scholar answers:", e);
    return [];
  }
}

export function saveScholarAnswer(item: SavedScholarAnswer): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedScholarAnswers();
    const filtered = current.filter((a) => a.id !== item.id);
    const updated = [item, ...filtered];
    localStorage.setItem(STORAGE_KEYS.SAVED_SCHOLAR_ANSWERS, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving scholar answer:", e);
  }
}

export function removeSavedScholarAnswer(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedScholarAnswers();
    const updated = current.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_SCHOLAR_ANSWERS, JSON.stringify(updated));
  } catch (e) {
    console.error("Error removing scholar answer:", e);
  }
}

export function togglePinScholarAnswer(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedScholarAnswers();
    const updated = current.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a));
    localStorage.setItem(STORAGE_KEYS.SAVED_SCHOLAR_ANSWERS, JSON.stringify(updated));
  } catch (e) {
    console.error("Error pinning scholar answer:", e);
  }
}

// -------------------------------------------------------------
// 4. Reading History
// -------------------------------------------------------------
export function getReadingHistory(): ReadingHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.READING_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function recordReadingHistory(item: ReadingHistoryItem): void {
  if (typeof window === "undefined") return;
  try {
    const current = getReadingHistory();
    // Filter duplicate if same surah and ayah
    const filtered = current.filter(
      (h) => !(h.surahId === item.surahId && h.ayahNumber === item.ayahNumber && h.authorName === item.authorName)
    );
    const updated = [item, ...filtered].slice(0, 30); // keep last 30
    localStorage.setItem(STORAGE_KEYS.READING_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error recording reading history:", e);
  }
}
