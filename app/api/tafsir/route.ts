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
const LOCAL_TAFSIR_MAP: Record<number, { folder: string; isUrdu: boolean; authorName: string; name: string }> = {
  60: { folder: "en-tafsir-al-mukhtasar", isUrdu: false, authorName: "Center for Quranic Interpretation", name: "Abridged Explanation of the Quran" },
  63: { folder: "en-al-jalalayn", isUrdu: false, authorName: "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti", name: "Tafsir al-Jalalayn" },
  64: { folder: "en-tazkirul-quran", isUrdu: false, authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  102: { folder: "ur-tafseer-ibn-e-kaseer", isUrdu: true, authorName: "Hafiz Ibn Kathir", name: "Tafsir Ibn Kathir" },
  103: { folder: "ur-tafsir-as-saadi-urdu", isUrdu: true, authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di", name: "Tafsir as-Sa'di" },
  104: { folder: "ur-tafsir-bayan-ul-quran", isUrdu: true, authorName: "Dr. Israr Ahmad / Maulana Thanwi", name: "Bayan-ul-Quran" },
  105: { folder: "tafsir-fe-zalul-quran-syed-qatab", isUrdu: true, authorName: "Sayyid Qutb", name: "Fi Zilal al-Quran" },
  106: { folder: "ur-tazkirul-quran", isUrdu: true, authorName: "Maulana Wahiduddin Khan", name: "Tazkirul Quran" },
  107: { folder: "en-kashf-al-asrar-tafsir", isUrdu: false, authorName: "Rashid al-Din Maybudi", name: "Kashf al-Asrar" },
  109: { folder: "en-kashani-tafsir", isUrdu: false, authorName: "Abd al-Razzaq al-Kashani", name: "Tafsir al-Kashani" },
  110: { folder: "en-tafsir-al-tustari", isUrdu: false, authorName: "Sahl al-Tustari", name: "Tafsir al-Tustari" },
  125: { folder: "ar-tafseer-tanwir-al-miqbas", isUrdu: false, authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
  128: { folder: "en-al-qushairi-tafsir", isUrdu: false, authorName: "Imam Abu al-Qasim al-Qushayri", name: "Lata'if al-Isharat" },
  129: { folder: "en-asbab-al-nuzul-by-al-wahidi", isUrdu: false, authorName: "Imam Ali ibn Ahmad al-Wahidi", name: "Asbab al-Nuzul" },
  131: { folder: "en-tafsir-ibn-abbas", isUrdu: false, authorName: "Attributed to Abdullah ibn Abbas", name: "Tanwir al-Miqbas" },
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

    const virtualAuthors: any[] = [
      { id: 100095, name: "Tafheem e Qur'an - Sayyid Maududi", authorName: "Sayyid Abul Ala Maududi", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100158, name: "Bayan-ul-Quran", authorName: "Dr. Israr Ahmad", languageId: 10, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
      { id: 100084, name: "Taqi Usmani", authorName: "Mufti Taqi Usmani", languageId: 3, era: "Modern & Contemporary (19th-21st CE)", tags: [] },
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
  ['tafsir-library-v2'],
  { revalidate: 2592000 } // 30 days
);

// 2. Ultra-fast local file tafsir loader (Reads directly from disk in < 1ms)
const getLocalDownloadedTafsir = unstable_cache(
  async (folder: string, isUrdu: boolean, authorId: number, surahId: number, authorName: string, name: string) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const tafsirFile = path.join(process.cwd(), 'database', 'downloaded_tafsirs', folder, `${surahId}.json`);
      if (!fs.existsSync(tafsirFile)) return null;

      const raw = fs.readFileSync(tafsirFile, 'utf8');
      const parsed = JSON.parse(raw);
      const ayahs = await prisma.ayah.findMany({
        where: { surahId },
        orderBy: { numberInSurah: 'asc' },
        select: { id: true, surahId: true, numberInSurah: true, text: true }
      });

      return (parsed.ayahs || []).map((a: any) => {
        const vNum = a.ayah;
        const arabicAyah = ayahs.find(ar => ar.numberInSurah === vNum);
        const textFormatted = isUrdu
          ? `<div class='text-zinc-100 leading-[2.8] text-right font-nastaliq' style="font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.8; font-size: 1.15rem; color: #f4f4f5;">${a.text}</div>`
          : a.text;

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
  ['local-downloaded-tafsir-v3'],
  { revalidate: 2592000 }
);

// 3. Cached DB Surah Tafsir Loader (Direct Paginated Query - fetches only requested 15 rows)
const getSurahDbTafsirPaginated = unstable_cache(
  async (authorId: number, surahId: number, start: number, count: number) => {
    const [rawTafsirs, totalCount, author] = await Promise.all([
      prisma.tafsirEntry.findMany({
        where: { authorId, surahId },
        orderBy: { ayahId: 'asc' },
        skip: Math.max(0, start - 1),
        take: count > 0 ? count : undefined,
        include: {
          ayah: {
            select: { id: true, surahId: true, numberInSurah: true, text: true }
          },
          author: {
            select: { id: true, name: true, authorName: true, languageId: true, era: true }
          }
        }
      }),
      prisma.tafsirEntry.count({
        where: { authorId, surahId }
      }),
      prisma.author.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, authorName: true, languageId: true, era: true }
      })
    ]);

    const data = rawTafsirs.map(t => ({
      id: t.id,
      authorId: t.authorId,
      surahId: t.surahId,
      ayahId: t.ayahId,
      text: t.text,
      ayah: t.ayah,
      author: t.author || author
    }));

    return { data, totalCount };
  },
  ['surah-db-tafsir-paginated-v1'],
  { revalidate: 2592000 } // 30 days
);

// 4. Cached Virtual Translation-Based Tafsir Loader
const getVirtualTafsir = unstable_cache(
  async (authorId: number, surahId: number, transId: string) => {
    const [translations, ayahs] = await Promise.all([
      getQuranComSurahTranslation(surahId, transId),
      prisma.ayah.findMany({
        where: { surahId },
        orderBy: { numberInSurah: 'asc' },
        select: { id: true, surahId: true, numberInSurah: true, text: true }
      })
    ]);
    
    return translations.map((t: any, index: number) => {
      let cleanText = t.text || "";
      const fIds: string[] = [];
      
      if (typeof t.text === "string") {
        cleanText = t.text.replace(/<sup foot_note=["']?(\d+)["']?>.*?<\/sup>/gi, (match: string, id: string) => {
          fIds.push(id);
          return ` <span class="text-emerald-500 font-bold">[${fIds.length}]</span> `;
        });
        cleanText = cleanText.replace(/<sup[^>]*>.*?<\/sup>/gi, "");
      }
      
      const verseNum = t.verse_number || t.numberInSurah || (index + 1);
      const arabicAyah = ayahs.find(a => a.numberInSurah === verseNum);
      
      return {
        id: authorId * 1000 + verseNum,
        authorId: authorId,
        surahId: surahId,
        ayahId: verseNum,
        text: cleanText,
        footnoteIds: fIds,
        ayah: {
          id: arabicAyah?.id || verseNum,
          surahId: surahId,
          numberInSurah: verseNum,
          text: arabicAyah?.text || "Arabic Text", 
        },
        author: { name: "Virtual Tafsir" }
      };
    });
  },
  ['virtual-tafsir-v2'],
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
          localMeta.isUrdu,
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

      // If local or virtual tafsirs were found, slice and return
      if (tafsirs.length > 0) {
        if (countNum > 0) {
          const sliced = tafsirs.slice(startNum - 1, startNum - 1 + countNum);
          return cachedJson({ success: true, data: sliced, totalCount: tafsirs.length }, 2592000, 86400);
        }
        return cachedJson({ success: true, data: tafsirs, totalCount: tafsirs.length }, 2592000, 86400);
      }

      // FAST PATH 3: Direct paginated database query (queries ONLY requested 15 rows from Turso)
      const { data: dbData, totalCount } = await getSurahDbTafsirPaginated(parsedAuthorId, parsedSurahId, startNum, countNum);
      return cachedJson({ success: true, data: dbData, totalCount }, 2592000, 86400);
    }

    // 3. Query a specific Ayah within a Surah for an Author
    if (surahId && ayahNum && authorId) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const parsedAyahNum = parseInt(ayahNum);

      // FAST PATH: Check local downloaded tafsir first
      const localMeta = LOCAL_TAFSIR_MAP[parsedAuthorId];
      if (localMeta) {
        const allSurahTafsirs = await getLocalDownloadedTafsir(
          localMeta.folder,
          localMeta.isUrdu,
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

      const [rawTafsirs, author, ayah] = await Promise.all([
        prisma.tafsirEntry.findMany({
          where: {
            authorId: parsedAuthorId,
            surahId: parsedSurahId,
            ayah: { numberInSurah: parsedAyahNum }
          },
          select: { id: true, authorId: true, surahId: true, ayahId: true, text: true }
        }),
        prisma.author.findUnique({
          where: { id: parsedAuthorId },
          select: { id: true, name: true, authorName: true }
        }),
        prisma.ayah.findFirst({
          where: { surahId: parsedSurahId, numberInSurah: parsedAyahNum },
          select: { id: true, surahId: true, numberInSurah: true, text: true }
        })
      ]);

      const tafsirs = rawTafsirs.map(t => ({
        ...t,
        ayah: ayah,
        author: author
      }));
      return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
    }

    return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
