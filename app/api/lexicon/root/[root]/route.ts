import { NextRequest, NextResponse } from 'next/server';
import { getLexiconEntriesForRoot } from '@/lib/lexicon/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ root: string }> }
) {
  try {
    const { root } = await params;
    const decodedRoot = decodeURIComponent(root);

    const result = await getLexiconEntriesForRoot(decodedRoot);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/lexicon/root/[root]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lexicon entries' }, { status: 500 });
  }
}
