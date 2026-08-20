import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Configured Promo / Discount Codes that grant instant free access to Pro or Patron
const PROMO_CODES: Record<
  string,
  {
    tier: "PRO" | "PATRON";
    description: string;
    expiresInDays?: number;
  }
> = {
  BARAKAH: {
    tier: "PATRON",
    description: "Special Barakah Community Pass - Lifetime Patron Access",
  },
  BARAKAH2026: {
    tier: "PATRON",
    description: "2026 Ummah Patron Pass",
  },
  SCHOLAR100: {
    tier: "PATRON",
    description: "Islamic Scholarship & Academic Grant Access",
  },
  TALIB: {
    tier: "PRO",
    description: "Student of Sacred Knowledge Pro Pass",
  },
  TALIBILM: {
    tier: "PRO",
    description: "Talib al-Ilm Pro Grant",
  },
  UMMAH: {
    tier: "PATRON",
    description: "Global Ummah Patron Sponsorship",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a valid code." },
        { status: 400 }
      );
    }

    const code = rawCode.trim().toUpperCase();
    const promo = PROMO_CODES[code];

    if (!promo) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid promo or discount code. Please check your spelling.",
        },
        { status: 400 }
      );
    }

    // Calculate expiry if applicable
    const expiresAt = promo.expiresInDays
      ? new Date(Date.now() + promo.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    return NextResponse.json({
      success: true,
      tier: promo.tier,
      message: `Alhamdulillah! You have successfully redeemed code "${code}" (${promo.description}).`,
      expiresAt,
    });
  } catch (error: any) {
    console.error("[PROMO-API-ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process promo code." },
      { status: 500 }
    );
  }
}
