import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature");
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is provided
    if (secret && signature) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");

      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data || {};
    const attributes = payload.data?.attributes;

    console.log(`[LEMON-WEBHOOK] Received event: ${eventName}`, {
      subscriptionId: payload.data?.id,
      tier: customData?.tier,
      status: attributes?.status,
    });

    const tier = customData?.tier || "PRO";
    const userIdentifier = customData?.user_id || attributes?.user_email;

    // Handle Subscription events
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed": {
        const status = attributes?.status; // 'active', 'on_trial', 'past_due', etc.
        const isActive = status === "active" || status === "on_trial";

        if (userIdentifier && isActive) {
          // Update user usage/tier in database if available
          try {
            await prisma.userUsage.upsert({
              where: { identifier: userIdentifier },
              update: {
                dailyTokensConsumed: 0,
              },
              create: {
                identifier: userIdentifier,
                dailyTokensConsumed: 0,
              },
            });
          } catch (dbErr) {
            console.error("[LEMON-WEBHOOK] DB update error:", dbErr);
          }
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        console.log(`[LEMON-WEBHOOK] Subscription ended for ${userIdentifier}`);
        break;
      }

      default:
        console.log(`[LEMON-WEBHOOK] Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ success: true, event: eventName });
  } catch (error: any) {
    console.error("[LEMON-WEBHOOK-ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
