import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Database from 'better-sqlite3';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language');
  const surahId = searchParams.get('surahId');
  const ayahNum = searchParams.get('ayahId'); // This is numberInSurah (e.g. 1, 2, 286)
  const authorId = searchParams.get('authorId');
  
  try {
    // 1. Basic query to fetch all languages & authors with eras and tags if no params provided
    if (!language && !surahId && !ayahNum && !authorId) {
      try {
        const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        const db = new Database(dbPath, { readonly: true });
        
        const langs = db.prepare(`SELECT * FROM Language ORDER BY name ASC`).all() as any[];
        const authors = db.prepare(`SELECT id, name, authorName, languageId, era FROM Author`).all() as any[];
        const authorTags = db.prepare(`
          SELECT at.A as authorId, t.id, t.name, t.color
          FROM _AuthorToTag at
          JOIN Tag t ON at.B = t.id
        `).all() as any[];
        db.close();

        // Virtual Authors (Translations serving as Tafsir)
        const virtualAuthors = [
          { id: 100095, name: "Tafheem e Qur'an - Sayyid Maududi", authorName: "Sayyid Abul Ala Maududi", languageId: 2, era: "Modern & Contemporary (19th-21st CE)" }, // English
          { id: 100097, name: "Tafheem e Qur'an - Sayyid Maududi", authorName: "Syed Abu Ali Maududi", languageId: 3, era: "Modern & Contemporary (19th-21st CE)" }, // Urdu
          { id: 100158, name: "Bayan-ul-Quran", authorName: "Dr. Israr Ahmad", languageId: 3, era: "Modern & Contemporary (19th-21st CE)" }, // Urdu
          { id: 100084, name: "Taqi Usmani", authorName: "Mufti Taqi Usmani", languageId: 2, era: "Modern & Contemporary (19th-21st CE)" }, // English
          { id: 100156, name: "Fe Zilal al-Qur'an", authorName: "Sayyid Ibrahim Qutb", languageId: 3, era: "Modern & Contemporary (19th-21st CE)" }, // Urdu
        ];
        
        const tagsMap: Record<number, any[]> = {};
        for (const at of authorTags) {
          if (!tagsMap[at.authorId]) tagsMap[at.authorId] = [];
          tagsMap[at.authorId].push({ id: at.id, name: at.name, color: at.color });
        }
        
        // Add virtual tags
        virtualAuthors.forEach(va => {
          tagsMap[va.id] = [{ id: 999, name: "Translation with Explanation", color: "emerald" }];
        });

        const authorsByLang: Record<number, any[]> = {};
        for (const a of [...authors, ...virtualAuthors]) {
          if (!authorsByLang[a.languageId]) authorsByLang[a.languageId] = [];
          authorsByLang[a.languageId].push({
            ...a,
            tags: tagsMap[a.id] || []
          });
        }

        const data = langs.map(l => ({
          ...l,
          authors: authorsByLang[l.id] || []
        }));

        return NextResponse.json({ success: true, data });
      } catch (sqliteErr) {
        console.error("SQLite fetch error, falling back to prisma:", sqliteErr);
        const languages = await prisma.language.findMany({
          include: { authors: true },
          orderBy: { name: 'asc' }
        });
        return NextResponse.json({ success: true, data: languages });
      }
    }

    // 2. Query all Ayahs + Tafsir for a specific Author and Surah (Full Surah Reader Mode)
    if (authorId && surahId && !ayahNum) {
      const parsedAuthorId = parseInt(authorId);
      
      if (parsedAuthorId > 100000) {
        // Handle virtual translation-based tafsir
        const transId = (parsedAuthorId - 100000).toString();
        const { getQuranComSurahTranslation } = await import('@/lib/translations');
        const translations = await getQuranComSurahTranslation(parseInt(surahId), transId);
        
        const tafsirs = translations.map((t: any, index: number) => {
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
          
          return {
            id: parsedAuthorId * 1000 + verseNum,
            authorId: parsedAuthorId,
            surahId: parseInt(surahId),
            ayahId: verseNum,
            text: cleanText,
            footnoteIds: fIds, // We pass footnoteIds to the client
            ayah: {
              id: verseNum,
              surahId: parseInt(surahId),
              numberInSurah: verseNum,
              text: "Arabic Text", // Fallback, client will handle Arabic text if needed
            },
            author: { name: "Virtual Tafsir" }
          };
        });
        
        return NextResponse.json({ success: true, data: tafsirs });
      }

      const tafsirs = await prisma.tafsirEntry.findMany({
        where: {
          authorId: parseInt(authorId),
          surahId: parseInt(surahId),
        },
        include: {
          ayah: true,
          author: true,
        },
      });

      // Sort properly by ayah.numberInSurah
      tafsirs.sort((a, b) => (a.ayah?.numberInSurah || 0) - (b.ayah?.numberInSurah || 0));

      return NextResponse.json({ success: true, data: tafsirs });
    }

    // 3. Query a specific Ayah within a Surah for an Author
    if (surahId && ayahNum && authorId) {
      const tafsirs = await prisma.tafsirEntry.findMany({
        where: {
          authorId: parseInt(authorId),
          surahId: parseInt(surahId),
          ayah: {
            numberInSurah: parseInt(ayahNum)
          }
        },
        include: {
          ayah: true,
          author: true
        }
      });
      return NextResponse.json({ success: true, data: tafsirs });
    }

    return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
