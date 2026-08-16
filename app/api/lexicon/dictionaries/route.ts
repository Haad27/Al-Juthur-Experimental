import { NextResponse } from 'next/server';
import { getDictionaries, getPdfDictionaries } from '@/lib/lexicon/service';

export async function GET() {
  try {
    const dicts = getDictionaries();
    const pdfDicts = getPdfDictionaries();
    return NextResponse.json(
      { dictionaries: dicts, pdfDictionaries: pdfDicts },
      {
        headers: {
          // Pure static data — hardcoded lists. Cache at CDN for 7 days.
          "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: any) {
    console.error('Error in GET /api/lexicon/dictionaries:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dictionaries' }, { status: 500 });
  }
}
