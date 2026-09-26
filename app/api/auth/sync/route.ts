import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, deviceId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
      create: {
        id: userId,
        email: email || null,
        name: name || null,
        tier: "FREE",
      },
      include: {
        subscription: true,
      },
    });

    let migratedHighlights = 0;
    let migratedNotes = 0;

    // If a guest deviceId is provided and different from the authenticated userId,
    // seamlessly migrate existing notes and highlights to the user's permanent account
    if (deviceId && deviceId !== userId) {
      const [hResult, nResult] = await Promise.all([
        prisma.userHighlight.updateMany({
          where: { identifier: deviceId },
          data: { identifier: userId },
        }),
        prisma.userNote.updateMany({
          where: { identifier: deviceId },
          data: { identifier: userId },
        }),
      ]);

      migratedHighlights = hResult.count;
      migratedNotes = nResult.count;
    }

    return NextResponse.json({
      success: true,
      user,
      migrated: {
        highlights: migratedHighlights,
        notes: migratedNotes,
      },
    });
  } catch (error: any) {
    console.error("[AUTH-SYNC-ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to synchronize user data" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId query param" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    const [noteCount, highlightCount] = await Promise.all([
      prisma.userNote.count({ where: { identifier: userId } }),
      prisma.userHighlight.count({ where: { identifier: userId } }),
    ]);

    return NextResponse.json({
      user,
      counts: {
        notes: noteCount,
        highlights: highlightCount,
      },
    });
  } catch (error) {
    console.error("[AUTH-GET-ERROR]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
