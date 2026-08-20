import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { tier, billingCycle, userEmail, userId } = await req.json();

    if (!tier || (tier !== "PRO" && tier !== "PATRON")) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription tier requested." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

    // Variant IDs mapped from environment variables or dashboard
    const variantKey = `LEMON_SQUEEZY_${tier}_${billingCycle === "yearly" ? "YEARLY" : "MONTHLY"}_VARIANT_ID`;
    const variantId = process.env[variantKey];

    // If Lemon Squeezy is fully configured
    if (apiKey && storeId && variantId && variantId !== "placeholder") {
      const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "checkouts",
            attributes: {
              checkout_data: {
                email: userEmail || undefined,
                custom: {
                  user_id: userId || "guest_user",
                  tier: tier,
                  billing_cycle: billingCycle,
                },
              },
              product_options: {
                redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/home?payment=success`,
              },
            },
            relationships: {
              store: {
                data: {
                  type: "stores",
                  id: String(storeId),
                },
              },
              variant: {
                data: {
                  type: "variants",
                  id: String(variantId),
                },
              },
            },
          },
        }),
      });

      const data = await response.json();
      const checkoutUrl = data?.data?.attributes?.url;

      if (checkoutUrl) {
        return NextResponse.json({ success: true, url: checkoutUrl });
      } else {
        console.error("[LEMON-SQUEEZY-CHECKOUT-ERROR]", data);
      }
    }

    // Fallback response for development / while store is pending approval
    return NextResponse.json({
      success: true,
      message: `Store verification is currently under review by compliance. You can use promo code 'ILOVEQURAN' or 'TALIB' to test full access instantly!`,
      tier,
      billingCycle,
    });
  } catch (error: any) {
    console.error("[CHECKOUT-ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate checkout session." },
      { status: 500 }
    );
  }
}
