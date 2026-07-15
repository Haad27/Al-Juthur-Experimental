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
        const authors = db.prepare(`SELECT id, name, languageId, era FROM Author`).all() as any[];
        const authorTags = db.prepare(`
          SELECT at.A as authorId, t.id, t.name, t.color
          FROM _AuthorToTag at
          JOIN Tag t ON at.B = t.id
        `).all() as any[];
        db.close();

        const tagsMap: Record<number, any[]> = {};
        for (const at of authorTags) {
          if (!tagsMap[at.authorId]) tagsMap[at.authorId] = [];
          tagsMap[at.authorId].push({ id: at.id, name: at.name, color: at.color });
        }

        const authorsByLang: Record<number, any[]> = {};
        for (const a of authors) {
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
