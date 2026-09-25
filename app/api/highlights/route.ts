import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('identifier');
  
  if (!identifier) {
    return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
  }

  try {
    const highlights = await prisma.userHighlight.findMany({
      where: { identifier },
      orderBy: { createdAt: 'desc' }
    });
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const identifier = searchParams.get('identifier');
  
  if (!id || !identifier) {
    return NextResponse.json({ error: 'Missing id or identifier' }, { status: 400 });
  }

  try {
    await prisma.userHighlight.deleteMany({
      where: {
        id,
        identifier // ensure user owns it
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
