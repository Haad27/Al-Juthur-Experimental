import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Database from 'better-sqlite3';
import path from 'path';
import { getTafsirDifficulty } from '@/lib/tafsirDifficulty';

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
          { id: 100158, name: "Bayan-ul-Quran", authorName: "Dr. Israr Ahmad", languageId: 10, era: "Modern & Contemporary (19th-21st CE)" }, // Urdu
          { id: 100084, name: "Taqi Usmani", authorName: "Mufti Taqi Usmani", languageId: 2, era: "Modern & Contemporary (19th-21st CE)" }, // English
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
        
        // Also tag the existing DB authors that we will upgrade
        [138, 139, 105, 158, 100158].forEach(id => {
          if (!tagsMap[id]) tagsMap[id] = [];
          if (!tagsMap[id].find(t => t.id === 999)) {
            tagsMap[id].push({ id: 999, name: "Translation with Explanation", color: "emerald" });
          }
        });

        const authorsByLang: Record<number, any[]> = {};
        for (const a of [...authors, ...virtualAuthors]) {
          if (!authorsByLang[a.languageId]) authorsByLang[a.languageId] = [];
          authorsByLang[a.languageId].push({
            ...a,
            tags: tagsMap[a.id] || [],
            difficulty: getTafsirDifficulty(a.name, a.authorName)
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

    // Check for Dr. Israr Ahmad local Bayan-ul-Quran tafsir files
    const isDrIsrar = (id: string | number) => id === 158 || id === 100158 || id === "158" || id === "100158";

    // 2. Query all Ayahs + Tafsir for a specific Author and Surah (Full Surah Reader Mode)
    if (authorId && surahId && !ayahNum) {
      const parsedAuthorId = parseInt(authorId);
      
      const DB_TO_TRANS_MAP: Record<number, string> = {
        138: "97",  // Maududi UR
        139: "151", // Taqi Usmani UR
        105: "156", // Qutb UR
        158: "158", // Israr UR
      };

      if (isDrIsrar(parsedAuthorId)) {
        const fs = await import('fs');
        const path = await import('path');
        const israrFile = path.join(process.cwd(), 'database', 'downloaded_tafsirs', 'ur-tafsir-bayan-ul-quran', `${surahId}.json`);
        if (fs.existsSync(israrFile)) {
          try {
            const raw = fs.readFileSync(israrFile, 'utf8');
            const parsed = JSON.parse(raw);
            const ayahs = await prisma.ayah.findMany({
              where: { surahId: parseInt(surahId) },
              orderBy: { numberInSurah: 'asc' }
            });
            const tafsirs = (parsed.ayahs || []).map((a: any) => {
              const vNum = a.ayah;
              const arabicAyah = ayahs.find(ar => ar.numberInSurah === vNum);
              return {
                id: 100158 * 1000 + vNum,
                authorId: parsedAuthorId,
                surahId: parseInt(surahId),
                ayahId: vNum,
                text: `<div class='text-zinc-100 leading-[2.8] text-right font-nastaliq' style="font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.8; font-size: 1.15rem; color: #f4f4f5;">${a.text}</div>`,
                ayah: {
                  id: arabicAyah?.id || vNum,
                  surahId: parseInt(surahId),
                  numberInSurah: vNum,
                  text: arabicAyah?.text || "Arabic Text",
                },
                author: { name: "Dr. Israr Ahmad", authorName: "Dr. Israr Ahmad" }
              };
            });
            return NextResponse.json({ success: true, data: tafsirs });
          } catch(e) {
            console.error("Error loading Israr local file", e);
          }
        }
      }
      
      if (parsedAuthorId > 100000 || DB_TO_TRANS_MAP[parsedAuthorId]) {
        // Handle virtual translation-based tafsir (or upgraded DB ones)
        const transId = parsedAuthorId > 100000 ? (parsedAuthorId - 100000).toString() : DB_TO_TRANS_MAP[parsedAuthorId];
        const { getQuranComSurahTranslation } = await import('@/lib/translations');
        
        // Run both fetches in parallel for efficiency
        const [translations, ayahs] = await Promise.all([
          getQuranComSurahTranslation(parseInt(surahId), transId),
          prisma.ayah.findMany({
            where: { surahId: parseInt(surahId) },
            orderBy: { numberInSurah: 'asc' }
          })
        ]);
        
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
          const arabicAyah = ayahs.find(a => a.numberInSurah === verseNum);
          
          return {
            id: parsedAuthorId * 1000 + verseNum,
            authorId: parsedAuthorId,
            surahId: parseInt(surahId),
            ayahId: verseNum,
            text: cleanText,
            footnoteIds: fIds, // We pass footnoteIds to the client
            ayah: {
              id: arabicAyah?.id || verseNum,
              surahId: parseInt(surahId),
              numberInSurah: verseNum,
              text: arabicAyah?.text || "Arabic Text", 
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
      const parsedAuthorId = parseInt(authorId);
      const parsedSurahId = parseInt(surahId);
      const parsedAyahNum = parseInt(ayahNum);

      if (isDrIsrar(parsedAuthorId)) {
        const fs = await import('fs');
        const path = await import('path');
        const israrFile = path.join(process.cwd(), 'database', 'downloaded_tafsirs', 'ur-tafsir-bayan-ul-quran', `${surahId}.json`);
        if (fs.existsSync(israrFile)) {
          try {
            const raw = fs.readFileSync(israrFile, 'utf8');
            const parsed = JSON.parse(raw);
            const match = (parsed.ayahs || []).find((a: any) => a.ayah === parsedAyahNum);
            if (match) {
              const arabicAyah = await prisma.ayah.findFirst({
                where: { surahId: parsedSurahId, numberInSurah: parsedAyahNum }
              });
              return NextResponse.json({
                success: true,
                data: [{
                  id: 100158 * 1000 + parsedAyahNum,
                  authorId: parsedAuthorId,
                  surahId: parsedSurahId,
                  ayahId: parsedAyahNum,
                  text: `<div class='text-zinc-100 leading-[2.8] text-right font-nastaliq' style="font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.8; font-size: 1.15rem; color: #f4f4f5;">${match.text}</div>`,
                  ayah: {
                    id: arabicAyah?.id || parsedAyahNum,
                    surahId: parsedSurahId,
                    numberInSurah: parsedAyahNum,
                    text: arabicAyah?.text || "Arabic Text"
                  },
                  author: { name: "Dr. Israr Ahmad", authorName: "Dr. Israr Ahmad" }
                }]
              });
            }
          } catch(e) {
            console.error("Error reading Israr single verse", e);
          }
        }
      }

      const tafsirs = await prisma.tafsirEntry.findMany({
        where: {
          authorId: parsedAuthorId,
          surahId: parsedSurahId,
          ayah: {
            numberInSurah: parsedAyahNum
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
