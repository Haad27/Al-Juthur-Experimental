import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTafsirDifficulty } from '@/lib/tafsirDifficulty';
import { unstable_cache } from 'next/cache';
import { getQuranComSurahTranslation } from '@/lib/translations';

// Helper to build a cached NextResponse
function cachedJson(data: unknown, maxAge: number, staleWhileRevalidate = Math.floor(maxAge / 4)) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}

// Map of Authors with 100% pre-downloaded local JSON files for lightning-fast 0ms file reads
const LOCAL_TAFSIR_MAP: Record<number, { folder: string; isUrdu?: boolean; isPashto?: boolean; authorName: string; name: string }> = {
  60: { folder: "en-tafsir-al-mukhtasar", authorName: "Center for Quranic Interpretation", name: "Abridged Explanation of the Quran" },
  63: { folder: "en-al-jalalayn", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti", name: "Tafsir al-Jalalayn" },
  64: { folder: "en-tazkirul-quran", authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  102: { folder: "ur-tafseer-ibn-e-kaseer", isUrdu: true, authorName: "Hafiz Ibn Kathir", name: "Tafsir Ibn Kathir" },
  103: { folder: "ur-tafsir-as-saadi-urdu", isUrdu: true, authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", name: "Tafsir as-Sa'di" },
  104: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad / Maulana Thanwi", name: "Bayan-ul-Quran" },
  105: { folder: "tafsir-fe-zalul-quran-syed-qatab", isUrdu: true, authorName: "Sayyid Qutb", name: "Fi Zilal al-Quran" },
  106: { folder: "ur-tazkirul-quran", isUrdu: true, authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  107: { folder: "en-kashf-al-asrar-tafsir", authorName: "Rashid al-Din Maybudi", name: "Kashf al-Asrar" },
  108: { folder: "en-al-qushairi-tafsir", authorName: "Imam Abu al-Qasim al-Qushayri", name: "Lata'if al-Isharat" },
  109: { folder: "en-kashani-tafsir", authorName: "Abd al-Razzaq al-Kashani", name: "Tafsir al-Kashani" },
  110: { folder: "en-tafsir-al-tustari", authorName: "Sahl al-Tustari", name: "Tafsir al-Tustari" },
  111: { folder: "en-asbab-al-nuzul-by-al-wahidi", authorName: "Imam Ali ibn Ahmad al-Wahidi", name: "Asbab al-Nuzul" },
  112: { folder: "en-tafsir-ibn-abbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  113: { folder: "en-al-jalalayn", authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti", name: "Tafsir al-Jalalayn" },
  114: { folder: "ps-pashto-mokhtasar", isPashto: true, authorName: "Center for Quranic Interpretation", name: "Al-Mukhtasar (Pashto)" },
  125: { folder: "ar-tafseer-tanwir-al-miqbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  128: { folder: "en-al-qushairi-tafsir", authorName: "Imam Abu al-Qasim al-Qushayri", name: "Lata'if al-Isharat" },
  129: { folder: "en-asbab-al-nuzul-by-al-wahidi", authorName: "Imam Ali ibn Ahmad al-Wahidi", name: "Asbab al-Nuzul" },
  131: { folder: "en-tafsir-ibn-abbas", authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  158: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad", name: "Bayan-ul-Quran" },
  100158: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad", name: "Bayan-ul-Quran" },
};

// 1. Cached library loader (languages + authors with tags & difficulty)
const getTafsirLibrary = unstable_cache(
  async () => {
    const [langs, authors] = await Promise.all([
      prisma.language.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.author.findMany({
        include: { tags: true },
      }),
    ]);

    // Virtual Authors (Translations with rich footnotes / commentary serving as Tafsir)
    const virtualAuthors: any[] = [
      // English (languageId: 3)
      { id: 100095, name: "Tafheem-ul-Quran (Commentary)", authorName: "Sayyid Abul Ala Maududi", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100084, name: "The Noble Quran (with Explanatory Notes)", authorName: "Mufti Taqi Usmani", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100022, name: "Quran Translation & Commentary", authorName: "Abdullah Yusuf Ali", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100203, name: "The Noble Quran (Interpretation & Notes)", authorName: "Muhammad Taqi-ud-Din al-Hilali & Muhammad Muhsin Khan", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100149, name: "Bridges’ Translation (Linguistic & Qira'at Notes)", authorName: "Fadel Soliman", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100085, name: "The Quran (Oxford World's Classics)", authorName: "M.A.S. Abdel Haleem", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      
      // Urdu (languageId: 10)
      { id: 100097, name: "Tafheem-ul-Quran (تفہیم القرآن)", authorName: "Syed Abul A'la Maududi", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100158, name: "Bayan-ul-Quran (بیان القرآن)", authorName: "Dr. Israr Ahmad", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100151, name: "Aasan Tarjuma Quran (آسان ترجمہ قرآن مع تفسیری حواشی)", authorName: "Mufti Muhammad Taqi Usmani", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100156, name: "Fi Zilal al-Qur'an (فی ظلال القرآن)", authorName: "Sayyid Ibrahim Qutb", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100819, name: "Tazkirul Quran (تذکیر القرآن)", authorName: "Maulana Wahiduddin Khan", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100831, name: "Tafheem-ul-Quran (Roman Urdu)", authorName: "Sayyid Abul Ala Maududi", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },

      // Pashto (languageId: 11)
      { id: 100118, name: "Pashto Translation & Commentary (د قرآن پښتو تفسیر)", authorName: "Zakaria Abulsalam", languageId: 11, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
    ];
    
    const virtualTag = { id: 999, name: "Translation with Explanation", color: "emerald" };
    virtualAuthors.forEach(va => {
      va.tags = [virtualTag];
    });
    
    authors.forEach(a => {
      if ([138, 139, 105, 158].includes(a.id)) {
        if (!a.tags.find((t: any) => t.id === 999)) {
          a.tags.push(virtualTag as any);
        }
      }
    });

    const authorsByLang: Record<number, any[]> = {};
    for (const a of [...authors, ...virtualAuthors]) {
      if (!authorsByLang[a.languageId]) authorsByLang[a.languageId] = [];
      authorsByLang[a.languageId].push({
        ...a,
        difficulty: getTafsirDifficulty(a.name, a.authorName)
      });
    }

    return langs.map(l => ({
      ...l,
      authors: authorsByLang[l.id] || []
    }));
  },
  ['tafsir-library-v4'],
  { revalidate: 2592000 } // 30 days
);

// Cached Surah Ayahs (Quran text never changes; 30-day memory cache)
const getAyahsForSurah = unstable_cache(
  async (surahId: number) => {
    return await prisma.ayah.findMany({
      where: { surahId },
      orderBy: { numberInSurah: 'asc' },
      select: { id: true, surahId: true, numberInSurah: true, text: true }
    });
  },
  ['tafsir-surah-ayahs-v1'],
  { revalidate: 2592000 } // 30 days
);

// 2. Ultra-fast local file tafsir loader (Reads directly from disk in < 1ms)
const getLocalDownloadedTafsir = unstable_cache(
  async (folder: string, isUrdu: boolean, isPashto: boolean, authorId: number, surahId: number, authorName: string, name: string) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const tafsirFile = path.join(process.cwd(), 'database', 'downloaded_tafsirs', folder, `${surahId}.json`);
      if (!fs.existsSync(tafsirFile)) return null;

      const raw = fs.readFileSync(tafsirFile, 'utf8');
      const parsed = JSON.parse(raw);
      const rawAyahs = Array.isArray(parsed) ? parsed : (parsed.ayahs || []);
      const ayahs = await getAyahsForSurah(surahId);

      return rawAyahs.map((a: any, idx: number) => {
        const vNum = a.ayah || a.numberInSurah || (idx + 1);
        const arabicAyah = ayahs.find(ar => ar.numberInSurah === vNum);
        
        let textFormatted = a.text;
        if (isUrdu) {
          textFormatted = `<div class='text-zinc-100 leading-[2.8] text-right font-nastaliq' style="font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.8; font-size: 1.15rem; color: #f4f4f5;">${a.text}</div>`;
        } else if (isPashto) {
          textFormatted = `<div class='text-zinc-100 leading-[2.4] text-right font-arabic' style="font-family: var(--font-amiri, serif); line-height: 2.4; font-size: 1.2rem; color: #f4f4f5;" dir="rtl">${a.text}</div>`;
        }

        return {
          id: authorId * 1000 + vNum,
          authorId: authorId,
          surahId: surahId,
          ayahId: vNum,
          text: textFormatted,
          ayah: {
            id: arabicAyah?.id || vNum,
            surahId: surahId,
            numberInSurah: vNum,
            text: arabicAyah?.text || "Arabic Text",
          },
          author: { name: name, authorName: authorName }
        };
      });
    } catch (e) {
      console.error(`Error loading local tafsir ${folder} for surah ${surahId}:`, e);
      return null;
    }
  },
  ['local-downloaded-tafsir-v4'],
  { revalidate: 2592000 }
);

// 3. Cached DB Surah Tafsir Loader (Fallback for authors not pre-downloaded)
const getSurahDbTafsir = unstable_cache(
  async (authorId: number, surahId: number) => {
    const [ayahs, author, rawTafsirs] = await Promise.all([
      getAyahsForSurah(surahId),
      prisma.author.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, authorName: true, languageId: true, era: true }
      }),
      prisma.tafsirEntry.findMany({
        where: { authorId, surahId },
        select: { id: true, authorId: true, surahId: true, ayahId: true, text: true }
      })
    ]);

    const ayahMap = new Map(ayahs.map(a => [a.id, a]));
    const tafsirs = rawTafsirs.map(t => ({
      ...t,
      ayah: ayahMap.get(t.ayahId),
      author: author
    }));

    tafsirs.sort((a, b) => (a.ayah?.numberInSurah || 0) - (b.ayah?.numberInSurah || 0));
    return tafsirs;
  },
  ['surah-db-tafsir-v3'],
  { revalidate: 2592000 } // 30 days
);

// Helper to prefetch all footnotes for a Surah in parallel
async function fetchSurahFootnotes(fIds: string[]): Promise<Record<string, string>> {
  if (!fIds || fIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(fIds));
  const results: Record<string, string> = {};

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${id}`, {
          next: { revalidate: 2592000 }, // Cache 30 days
        });
        if (res.ok) {
          const data = await res.json();
          if (data.foot_note?.text) {
            results[id] = data.foot_note.text;
          }
        }
      } catch (e) {
        console.error(`Failed to prefetch footnote ${id}:`, e);
      }
    })
  );
  return results;
}

// 4. Cached Virtual Translation-Based Tafsir Loader (Pre-fetches and embeds all commentary footnotes)
const getVirtualTafsir = unstable_cache(
  async (authorId: number, surahId: number, transId: string) => {
    const [translations, ayahs] = await Promise.all([
      getQuranComSurahTranslation(surahId, transId),
      getAyahsForSurah(surahId),
    ]);

    const footnoteRegex = /<[a-z0-9]+\b[^>]*(?:foot_note|footnote_id|footnote-id|footnote|data-foot_note|data-footnote)=["']?(\d+)["']?[^>]*>[\s\S]*?<\/[a-z0-9]+>/gi;

    // Collect all footnote IDs for the entire Surah to batch-fetch in 1 parallel wave
    const allFootnoteIds: string[] = [];
    translations.forEach((t: any) => {
      if (typeof t.text === "string") {
        let match;
        const localRegex = new RegExp(footnoteRegex.source, "gi");
        while ((match = localRegex.exec(t.text)) !== null) {
          allFootnoteIds.push(match[1]);
        }
      }
    });

    const footnoteTexts = await fetchSurahFootnotes(allFootnoteIds);

    return translations.map((t: any, index: number) => {
      let cleanText = t.text || "";
      const fIds: string[] = [];
      const verseFootnotes: Record<string, string> = {};

      if (typeof t.text === "string") {
        cleanText = t.text.replace(footnoteRegex, (_match: string, id: string) => {
          fIds.push(id);
          if (footnoteTexts[id]) {
            verseFootnotes[id] = footnoteTexts[id];
          }
          return ` <span class="text-emerald-500 font-bold">[${fIds.length}]</span> `;
        });
        cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/gi, "");
      }

      const verseNum = t.verse_number || t.numberInSurah || (index + 1);
      const arabicAyah = ayahs.find((a) => a.numberInSurah === verseNum);

      return {
        id: authorId * 1000 + verseNum,
        authorId: authorId,
        surahId: surahId,
        ayahId: verseNum,
        text: cleanText,
        footnoteIds: fIds,
        footnotes: verseFootnotes, // Pre-populated footnotes for frame-0 instant rendering!
        ayah: {
          id: arabicAyah?.id || verseNum,
          surahId: surahId,
          numberInSurah: verseNum,
          text: arabicAyah?.text || "Arabic Text",
        },
        author: { name: "Virtual Tafsir" },
      };
    });
  },
  ['virtual-tafsir-v5'],
  { revalidate: 2592000 } // 30 days
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language');
  const surahId = searchParams.get('surahId');
  const ayahNum = searchParams.get('ayahId');
  const authorId = searchParams.get('authorId');

  try {
    // 1. Basic query to fetch all languages & authors
    if (!language && !surahId && !ayahNum && !authorId) {
      try {
        const data = await getTafsirLibrary();
        return cachedJson({ success: true, data }, 2592000, 86400);
      } catch (err) {
        console.error("Prisma fetch error in library load:", err);
        return NextResponse.json({ success: false, error: 'Failed to load library' }, { status: 500 });
      }
    }

    // 2. Query all Ayahs + Tafsir for a specific Author and Surah (Full Surah Reader Mode with optional pagination)
    if (authorId && surahId && !ayahNum) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const startParam = searchParams.get('start');
      const countParam = searchParams.get('count');
      const startNum = startParam ? Math.max(1, parseInt(startParam)) : 1;
      const countNum = countParam ? Math.max(1, parseInt(countParam)) : 0;

      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
      };

      let tafsirs: any[] = [];

      // FAST PATH 1: Pre-downloaded Local JSON Tafsirs (< 1ms read from disk)
      const localMeta = LOCAL_TAFSIR_MAP[parsedAuthorId];
      if (localMeta) {
        const localData = await getLocalDownloadedTafsir(
          localMeta.folder,
          !!localMeta.isUrdu,
          !!localMeta.isPashto,
          parsedAuthorId,
          parsedSurahId,
          localMeta.authorName,
          localMeta.name
        );
        if (localData && localData.length > 0) {
          tafsirs = localData;
        }
      }

      // FAST PATH 2: Virtual translation-based tafsirs
      if (tafsirs.length === 0 && (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId])) {
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        tafsirs = await getVirtualTafsir(parsedAuthorId, parsedSurahId, transId);
      }

      // FALLBACK: Database query
      if (tafsirs.length === 0) {
        tafsirs = await getSurahDbTafsir(parsedAuthorId, parsedSurahId);
      }

      if (countNum > 0) {
        const sliced = tafsirs.slice(startNum - 1, startNum - 1 + countNum);
        return cachedJson({ success: true, data: sliced, totalCount: tafsirs.length }, 2592000, 86400);
      }

      return cachedJson({ success: true, data: tafsirs, totalCount: tafsirs.length }, 2592000, 86400);
    }

    // 3. Query a specific Ayah within a Surah for an Author
    if (surahId && ayahNum && authorId) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const parsedAyahNum = parseInt(ayahNum);

      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
      };

      // FAST PATH 1: Check local downloaded tafsir first
      const localMeta = LOCAL_TAFSIR_MAP[parsedAuthorId];
      if (localMeta) {
        const allSurahTafsirs = await getLocalDownloadedTafsir(
          localMeta.folder,
          !!localMeta.isUrdu,
          !!localMeta.isPashto,
          parsedAuthorId,
          parsedSurahId,
          localMeta.authorName,
          localMeta.name
        );
        if (allSurahTafsirs && allSurahTafsirs.length > 0) {
          const match = allSurahTafsirs.filter((t: any) => t.ayahId === parsedAyahNum || t.ayah?.numberInSurah === parsedAyahNum);
          return cachedJson({ success: true, data: match }, 2592000, 86400);
        }
      }

      // FAST PATH 2: Check virtual translation-based tafsir for single ayah
      if (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId]) {
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        const allSurahTafsirs = await getVirtualTafsir(parsedAuthorId, parsedSurahId, transId);
        if (allSurahTafsirs && allSurahTafsirs.length > 0) {
          const match = allSurahTafsirs.filter((t: any) => t.ayahId === parsedAyahNum || t.ayah?.numberInSurah === parsedAyahNum);
          return cachedJson({ success: true, data: match }, 2592000, 86400);
        }
      }

      const [rawTafsirs, author, ayah] = await Promise.all([
        prisma.tafsirEntry.findMany({
          where: {
            authorId: parsedAuthorId,
            surahId: parsedSurahId,
            ayah: { numberInSurah: parsedAyahNum },
          },
          select: { id: true, authorId: true, surahId: true, ayahId: true, text: true },
        }),
        prisma.author.findUnique({
          where: { id: parsedAuthorId },
          select: { id: true, name: true, authorName: true },
        }),
        prisma.ayah.findFirst({
          where: { surahId: parsedSurahId, numberInSurah: parsedAyahNum },
          select: { id: true, surahId: true, numberInSurah: true, text: true },
        }),
      ]);

      const tafsirs = rawTafsirs.map((t) => ({
        ...t,
        ayah: ayah,
        author: author,
      }));
      return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
    }

    return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
