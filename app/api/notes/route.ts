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
    const notes = await prisma.userNote.findMany({
      where: {
        identifier: { in: ids }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Auto-migrate in background if logged in user has deviceId notes
    if (identifier && deviceId && identifier !== deviceId && notes.some(n => n.identifier === deviceId)) {
      prisma.userNote.updateMany({
        where: { identifier: deviceId },
        data: { identifier }
      }).catch(err => console.error("Error auto-migrating notes:", err));
    }

    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, surahId, ayahNumber, text } = body;

    if (
      !identifier ||
      surahId === undefined ||
      surahId === null ||
      isNaN(Number(surahId)) ||
      ayahNumber === undefined ||
      ayahNumber === null ||
      isNaN(Number(ayahNumber)) ||
      !text
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const note = await prisma.userNote.create({
      data: {
        identifier,
        surahId: Number(surahId),
        ayahNumber: Number(ayahNumber),
        text
      }
    });

    return NextResponse.json(note);
  } catch (error) {
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
    await prisma.userNote.deleteMany({
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
