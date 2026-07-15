import { NextRequest, NextResponse } from 'next/server';
import { generateScholarlyAnswer } from '@/lib/ai/scholar/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid question or topic query.' },
        { status: 400 }
      );
    }

    const result = await generateScholarlyAnswer(query);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error in POST /api/ai/scholar:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate scholarly answer.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query parameter q is required.' },
        { status: 400 }
      );
    }

    const result = await generateScholarlyAnswer(query);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error in GET /api/ai/scholar:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate scholarly answer.' },
      { status: 500 }
    );
  }
}
