import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileParam = searchParams.get('file');

  if (!fileParam) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }

  // Security check: prevent directory traversal
  const normalizedPath = path.normalize(fileParam).replace(/^(\.\.[\/\\])+/, '');
  if (normalizedPath.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
  }

  const basePdfDir = path.join(process.cwd(), 'database', 'pdf', 'lexicon');
  const fullPath = path.join(basePdfDir, normalizedPath);

  // Ensure fullPath stays inside basePdfDir
  if (!fullPath.startsWith(basePdfDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'PDF file not found' }, { status: 404 });
  }

  try {
    const fileStat = fs.statSync(fullPath);
    const fileStream = fs.createReadStream(fullPath);

    // Convert ReadStream to ReadableStream for Next.js App Router
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    const filename = path.basename(fullPath);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': fileStat.size.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error streaming PDF:', error);
    return NextResponse.json({ error: 'Failed to stream PDF' }, { status: 500 });
  }
}
