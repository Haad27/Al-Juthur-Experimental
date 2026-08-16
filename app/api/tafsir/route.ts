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

// Check for Dr. Israr Ahmad local Bayan-ul-Quran tafsir files
const isDrIsrar = (id: string | number) => id === 158 || id === 100158 || id === "158" || id === "100158";

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
  ['tafsir-library-v1'],
  { revalidate: 2592000 } // 30 days
);

// 2. Cached DB Surah Tafsir Loader (Runs Ayahs, Author, and Tafsir in parallel with SELECT projection)
const getSurahDbTafsir = unstable_cache(
  async (authorId: number, surahId: number) => {
    const [ayahs, author, rawTafsirs] = await Promise.all([
      prisma.ayah.findMany({
        where: { surahId },
        orderBy: { numberInSurah: 'asc' },
        select: { id: true, surahId: true, numberInSurah: true, text: true }
      }),
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
  ['surah-db-tafsir-v1'],
  { revalidate: 2592000 } // 30 days
);

// 3. Cached Virtual Translation-Based Tafsir Loader
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
  ['virtual-tafsir-v1'],
  { revalidate: 2592000 } // 30 days
);

// 4. Cached Dr Israr Tafsir Loader
const getDrIsrarSurahTafsir = unstable_cache(
  async (surahId: number) => {
    const fs = await import('fs');
    const path = await import('path');
    const israrFile = path.join(process.cwd(), 'database', 'downloaded_tafsirs', 'ur-tafsir-bayan-ul-quran', `${surahId}.json`);
    if (!fs.existsSync(israrFile)) return [];

    const raw = fs.readFileSync(israrFile, 'utf8');
    const parsed = JSON.parse(raw);
    const ayahs = await prisma.ayah.findMany({
      where: { surahId },
      orderBy: { numberInSurah: 'asc' },
      select: { id: true, surahId: true, numberInSurah: true, text: true }
    });

    return (parsed.ayahs || []).map((a: any) => {
      const vNum = a.ayah;
      const arabicAyah = ayahs.find(ar => ar.numberInSurah === vNum);
      return {
        id: 100158 * 1000 + vNum,
        authorId: 100158,
        surahId: surahId,
        ayahId: vNum,
        text: `<div class='text-zinc-100 leading-[2.8] text-right font-nastaliq' style="font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.8; font-size: 1.15rem; color: #f4f4f5;">${a.text}</div>`,
        ayah: {
          id: arabicAyah?.id || vNum,
          surahId: surahId,
          numberInSurah: vNum,
          text: arabicAyah?.text || "Arabic Text",
        },
        author: { name: "Dr. Israr Ahmad", authorName: "Dr. Israr Ahmad" }
      };
    });
  },
  ['dr-israr-tafsir-v1'],
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

    // 2. Query all Ayahs + Tafsir for a specific Author and Surah (Full Surah Reader Mode)
    if (authorId && surahId && !ayahNum) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      
      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
        105: "156", // Qutb UR
        158: "158", // Israr UR
      };

      if (isDrIsrar(parsedAuthorId)) {
        const tafsirs = await getDrIsrarSurahTafsir(parsedSurahId);
        return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
      }
      
      if (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId]) {
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        const tafsirs = await getVirtualTafsir(parsedAuthorId, parsedSurahId, transId);
        return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
      }

      const tafsirs = await getSurahDbTafsir(parsedAuthorId, parsedSurahId);
      return cachedJson({ success: true, data: tafsirs }, 2592000, 86400);
    }

    // 3. Query a specific Ayah within a Surah for an Author
    if (surahId && ayahNum && authorId) {
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const parsedAyahNum = parseInt(ayahNum);

      if (isDrIsrar(parsedAuthorId)) {
        const allSurahTafsirs = await getDrIsrarSurahTafsir(parsedSurahId);
        const match = allSurahTafsirs.filter((t: any) => t.ayahId === parsedAyahNum || t.ayah?.numberInSurah === parsedAyahNum);
        return cachedJson({ success: true, data: match }, 2592000, 86400);
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
