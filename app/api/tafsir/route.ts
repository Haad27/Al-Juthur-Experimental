import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get('language');
  const surahId = searchParams.get('surahId');
  const ayahId = searchParams.get('ayahId');
  
  try {
    // Basic query to fetch all authors/languages if no params provided
    if (!language && !surahId && !ayahId) {
      const languages = await prisma.language.findMany({
        include: { authors: true }
      });
      return NextResponse.json({ success: true, data: languages });
    }

    // Specific query for a tafsir
    if (surahId && ayahId) {
      const tafsirs = await prisma.tafsirEntry.findMany({
        where: {
          surahId: parseInt(surahId),
          ayahId: parseInt(ayahId),
        },
        include: {
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
