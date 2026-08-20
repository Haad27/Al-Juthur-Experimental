import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanTier = "FREE" | "PRO" | "PATRON";
export type BillingCycle = "monthly" | "yearly";

export interface SubscriptionState {
  tier: PlanTier;
  billingCycle: BillingCycle;
  dailyQueriesUsed: number;
  dailyQueriesLimit: number;
  isPricingModalOpen: boolean;
  activePromoCode: string | null;
  promoExpiresAt: string | null;
  
  // Actions
  openPricingModal: () => void;
  closePricingModal: () => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setTier: (tier: PlanTier) => void;
  incrementDailyQueries: () => void;
  resetDailyQueries: () => void;
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string; tier?: PlanTier }>;
}

export const TIER_LIMITS: Record<PlanTier, number> = {
  FREE: 5,
  PRO: 50,
  PATRON: 150,
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: "FREE",
      billingCycle: "yearly",
      dailyQueriesUsed: 0,
      dailyQueriesLimit: TIER_LIMITS.FREE,
      isPricingModalOpen: false,
      activePromoCode: null,
      promoExpiresAt: null,

      openPricingModal: () => set({ isPricingModalOpen: true }),
      closePricingModal: () => set({ isPricingModalOpen: false }),

      setBillingCycle: (billingCycle) => set({ billingCycle }),

      setTier: (tier) =>
        set({
          tier,
          dailyQueriesLimit: TIER_LIMITS[tier],
        }),

      incrementDailyQueries: () =>
        set((state) => ({
          dailyQueriesUsed: state.dailyQueriesUsed + 1,
        })),

      resetDailyQueries: () =>
        set((state) => ({
          dailyQueriesUsed: 0,
          dailyQueriesLimit: TIER_LIMITS[state.tier],
        })),

      applyPromoCode: async (code: string) => {
        const cleanCode = code.trim().toUpperCase();
        
        try {
          const res = await fetch("/api/promo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: cleanCode }),
          });

          const data = await res.json();
          if (data.success && data.tier) {
            set({
              tier: data.tier,
              dailyQueriesLimit: TIER_LIMITS[data.tier as PlanTier] || 150,
              activePromoCode: cleanCode,
              promoExpiresAt: data.expiresAt || null,
            });
            return {
              success: true,
              message: data.message || `BarakAllahu Feek! You have unlocked full ${data.tier} Access.`,
              tier: data.tier,
            };
          } else {
            return {
              success: false,
              message: data.error || "Invalid or expired promo code.",
            };
          }
        } catch (error) {
          // Client-side fallback if server route is offline
          const VIP_CODES: Record<string, PlanTier> = {
            BARAKAH: "PATRON",
            TALIB: "PRO",
            ALJUTHUR2026: "PATRON",
            SCHOLAR100: "PATRON",
            UMMAH: "PATRON",
          };

          if (VIP_CODES[cleanCode]) {
            const unlockedTier = VIP_CODES[cleanCode];
            set({
              tier: unlockedTier,
              dailyQueriesLimit: TIER_LIMITS[unlockedTier],
              activePromoCode: cleanCode,
            });
            return {
              success: true,
              message: `Special Access Granted! Full ${unlockedTier} Tier activated.`,
              tier: unlockedTier,
            };
          }

          return {
            success: false,
            message: "Invalid discount or promo code. Please check and try again.",
          };
        }
      },
    }),
    {
      name: "al-juthur-subscription-v1",
      partialize: (state) => ({
        tier: state.tier,
        billingCycle: state.billingCycle,
        dailyQueriesUsed: state.dailyQueriesUsed,
        activePromoCode: state.activePromoCode,
        promoExpiresAt: state.promoExpiresAt,
      }),
    }
  )
);
