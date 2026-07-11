import { NextResponse } from 'next/server';
import { getSurahWords } from '@/lib/lexicon/service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const surahParam = searchParams.get('surah');

  if (!surahParam) {
    return NextResponse.json({ error: 'Missing surah parameter' }, { status: 400 });
  }

  const surah = parseInt(surahParam, 10);
  if (isNaN(surah)) {
    return NextResponse.json({ error: 'Invalid surah parameter' }, { status: 400 });
  }

  try {
    const map = getSurahWords(surah);
    return NextResponse.json(map);
  } catch (error) {
    console.error('Error in /api/lexicon/surah-words:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
