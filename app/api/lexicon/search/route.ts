import { NextRequest, NextResponse } from 'next/server';
import { searchRoots } from '@/lib/lexicon/service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const roots = await searchRoots(query, limit);
    return NextResponse.json({ query, roots });
  } catch (error: any) {
    console.error('Error in GET /api/lexicon/search:', error);
    return NextResponse.json({ error: error.message || 'Failed to search roots' }, { status: 500 });
  }
}
