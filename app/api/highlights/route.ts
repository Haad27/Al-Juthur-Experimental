import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('identifier');
  const deviceId = searchParams.get('deviceId');
  
  if (!identifier && !deviceId) {
    return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
  }

  const ids = Array.from(new Set([identifier, deviceId].filter(Boolean))) as string[];

  try {
    const highlights = await prisma.userHighlight.findMany({
      where: {
        identifier: { in: ids }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Auto-migrate in background if logged in user has deviceId highlights
    if (identifier && deviceId && identifier !== deviceId && highlights.some(h => h.identifier === deviceId)) {
      prisma.userHighlight.updateMany({
        where: { identifier: deviceId },
        data: { identifier }
      }).catch(err => console.error("Error auto-migrating highlights:", err));
    }

    return NextResponse.json(highlights);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, surahId, ayahNumber, text, type, authorName, color } = body;

    if (!identifier || !surahId || !ayahNumber || !text) {
      console.error("Missing required fields for highlight:", { identifier, surahId, ayahNumber, text_length: text?.length });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const highlight = await prisma.userHighlight.create({
      data: {
        identifier,
        surahId: Number(surahId),
        ayahNumber: Number(ayahNumber),
        text,
        type: type || 'arabic',
        authorName,
        color: color || 'gold'
      }
    });

    return NextResponse.json(highlight);
  } catch (error) {
    console.error("Error creating highlight:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const identifier = searchParams.get('identifier');
  const deviceId = searchParams.get('deviceId');
  
  if (!id || (!identifier && !deviceId)) {
    return NextResponse.json({ error: 'Missing id or identifier' }, { status: 400 });
  }

  const ids = Array.from(new Set([identifier, deviceId].filter(Boolean))) as string[];

  try {
    await prisma.userHighlight.deleteMany({
      where: {
        id,
        identifier: { in: ids }
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
