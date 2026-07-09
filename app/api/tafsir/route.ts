import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language');
  const surahId = searchParams.get('surahId');
  const ayahNum = searchParams.get('ayahId'); // This is numberInSurah (e.g. 1, 2, 286)
  const authorId = searchParams.get('authorId');
  
  try {
    // 1. Basic query to fetch all languages & authors if no params provided
    if (!language && !surahId && !ayahNum && !authorId) {
      const languages = await prisma.language.findMany({
        include: { authors: true },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json({ success: true, data: languages });
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
