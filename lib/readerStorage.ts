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
  RECENT_QURAN: "recent",
};

export interface RecentQuranReading {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  lastReadAyah?: number;
  ayah?: number;
  updatedAt?: number;
}

export function getRecentQuranReading(): RecentQuranReading | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_QURAN);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && data.number) {
      return data;
    }
    return null;
  } catch (e) {
    console.error("Error reading recent quran reading:", e);
    return null;
  }
}

export function setRecentQuranReading(
  surahData: Partial<RecentQuranReading> & { number: number; lastReadAyah: number }
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentQuranReading();
    const payload: RecentQuranReading = {
      name: "",
      englishName: "",
      englishNameTranslation: "",
      numberOfAyahs: 0,
      revelationType: "",
      ...existing,
      ...surahData,
      ayah: surahData.lastReadAyah,
      lastReadAyah: surahData.lastReadAyah,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.RECENT_QURAN, JSON.stringify(payload));
  } catch (e) {
    console.error("Error saving recent quran reading:", e);
  }
}

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

// -------------------------------------------------------------
// 5. Notes & Highlights (Database backed via API)
// -------------------------------------------------------------
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let deviceId = localStorage.getItem("aljuthur-device-id");
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("aljuthur-device-id", deviceId);
  }
  return deviceId;
}

export function getUserIdentifier(): string {
  if (typeof window === "undefined") return "server";
  const authUserId = localStorage.getItem("aljuthur-auth-user-id");
  if (authUserId) return authUserId;
  return getDeviceId();
}

export function setAuthUserIdentifier(userId: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) {
    localStorage.setItem("aljuthur-auth-user-id", userId);
  } else {
    localStorage.removeItem("aljuthur-auth-user-id");
  }
}

export interface UserNote {
  id: string;
  surahId: number;
  ayahNumber: number;
  text: string;
  createdAt: string;
}

export interface UserHighlight {
  id: string;
  surahId: number;
  ayahNumber: number;
  text: string;
  type: string;
  authorName?: string;
  color?: string;
  createdAt: string;
}

export function getStoredUserNotes(): UserNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("aljuthur-cached-notes");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function getStoredUserHighlights(): UserHighlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("aljuthur-cached-highlights");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function fetchUserNotes(): Promise<UserNote[]> {
  const id = getUserIdentifier();
  const deviceId = getDeviceId();
  
  // Fast offline/local fallback
  const cached: UserNote[] = getStoredUserNotes();

  try {
    const res = await fetch(`/api/notes?identifier=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return cached;
    const serverNotes: UserNote[] = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("aljuthur-cached-notes", JSON.stringify(serverNotes));
    }
    return serverNotes;
  } catch {
    return cached;
  }
}

export async function saveUserNote(surahId: number, ayahNumber: number, text: string): Promise<UserNote | null> {
  const id = getUserIdentifier();
  const tempId = "note_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
  const localNote: UserNote = {
    id: tempId,
    surahId,
    ayahNumber,
    text,
    createdAt: new Date().toISOString()
  };

  // Immediate optimistic local save
  if (typeof window !== "undefined") {
    try {
      const existing = getStoredUserNotes();
      const filtered = existing.filter(n => !(n.surahId === surahId && n.ayahNumber === ayahNumber && n.text === text));
      localStorage.setItem("aljuthur-cached-notes", JSON.stringify([localNote, ...filtered]));
    } catch {}
  }

  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, surahId, ayahNumber, text })
    });
    if (!res.ok) return localNote;
    const serverNote: UserNote = await res.json();
    if (typeof window !== "undefined") {
      try {
        const existing = getStoredUserNotes();
        const updated = existing.map(n => n.id === tempId ? serverNote : n);
        localStorage.setItem("aljuthur-cached-notes", JSON.stringify(updated));
      } catch {}
    }
    return serverNote;
  } catch {
    return localNote;
  }
}

export async function deleteUserNote(noteId: string): Promise<boolean> {
  const id = getUserIdentifier();
  const deviceId = getDeviceId();

  // Immediate optimistic local removal
  if (typeof window !== "undefined") {
    try {
      const existing = getStoredUserNotes();
      const filtered = existing.filter((n: UserNote) => n.id !== noteId);
      localStorage.setItem("aljuthur-cached-notes", JSON.stringify(filtered));
    } catch {}
  }

  try {
    const res = await fetch(`/api/notes?identifier=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}&id=${encodeURIComponent(noteId)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return true;
  }
}

export async function fetchUserHighlights(): Promise<UserHighlight[]> {
  const id = getUserIdentifier();
  const deviceId = getDeviceId();

  // Fast offline/local fallback
  const cached: UserHighlight[] = getStoredUserHighlights();

  try {
    const res = await fetch(`/api/highlights?identifier=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) return cached;
    const serverHighlights: UserHighlight[] = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("aljuthur-cached-highlights", JSON.stringify(serverHighlights));
    }
    return serverHighlights;
  } catch {
    return cached;
  }
}

export async function saveUserHighlight(surahId: number, ayahNumber: number, text: string, type: 'arabic'|'translation', authorName?: string, color?: string): Promise<UserHighlight | null> {
  const id = getUserIdentifier();
  const tempId = "hl_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
  const localHighlight: UserHighlight = {
    id: tempId,
    surahId,
    ayahNumber,
    text,
    type,
    authorName,
    color: color || "gold",
    createdAt: new Date().toISOString()
  };

  // Immediate optimistic local save
  if (typeof window !== "undefined") {
    try {
      const existing = getStoredUserHighlights();
      const filtered = existing.filter(h => !(h.surahId === surahId && h.ayahNumber === ayahNumber && h.text === text));
      localStorage.setItem("aljuthur-cached-highlights", JSON.stringify([localHighlight, ...filtered]));
    } catch {}
  }

  try {
    const res = await fetch('/api/highlights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, surahId, ayahNumber, text, type, authorName, color: color || "gold" })
    });
    if (!res.ok) return localHighlight;
    const serverHighlight: UserHighlight = await res.json();
    if (typeof window !== "undefined") {
      try {
        const existing = getStoredUserHighlights();
        const updated = existing.map(h => h.id === tempId ? serverHighlight : h);
        localStorage.setItem("aljuthur-cached-highlights", JSON.stringify(updated));
      } catch {}
    }
    return serverHighlight;
  } catch {
    return localHighlight;
  }
}

export async function deleteUserHighlight(highlightId: string): Promise<boolean> {
  const id = getUserIdentifier();
  const deviceId = getDeviceId();

  // Immediate optimistic local removal
  if (typeof window !== "undefined") {
    try {
      const existing = getStoredUserHighlights();
      const filtered = existing.filter((h: UserHighlight) => h.id !== highlightId);
      localStorage.setItem("aljuthur-cached-highlights", JSON.stringify(filtered));
    } catch {}
  }

  try {
    const res = await fetch(`/api/highlights?identifier=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}&id=${encodeURIComponent(highlightId)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return true;
  }
}

