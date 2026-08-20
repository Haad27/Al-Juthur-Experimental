"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Sparkles,
  Zap,
  Crown,
  HeartHandshake,
  Tag,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Loader2,
  Gift,
} from "lucide-react";
import { useSubscriptionStore, PlanTier, BillingCycle } from "@/lib/stores/subscriptionStore";
import { toast } from "sonner";

interface PricingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const store = useSubscriptionStore();
  const showModal = isOpen !== undefined ? isOpen : store.isPricingModalOpen;
  const handleClose = onClose || store.closePricingModal;

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(store.billingCycle);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const currentTier = store.tier;

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    setIsApplyingPromo(true);
    try {
      const result = await store.applyPromoCode(promoCodeInput);
      if (result.success) {
        toast.success(result.message, {
          description: "All premium scholarly features and unlimited RAG queries unlocked!",
          duration: 6000,
        });
        setPromoCodeInput("");
        setShowPromoInput(false);
      } else {
        toast.error("Promo Code Error", {
          description: result.message,
        });
      }
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleSelectPlan = async (tier: PlanTier) => {
    if (tier === "FREE") {
      store.setTier("FREE");
      toast.info("Free Plan Active", {
        description: "You have 5 complimentary AI research queries every single day.",
      });
      handleClose();
      return;
    }

    setCheckoutLoading(tier);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.fallbackUrl) {
        window.open(data.fallbackUrl, "_blank");
      } else {
        // Mock success fallback for preview while store is pending approval
        toast.success(`Redirecting to ${tier} Checkout...`, {
          description: data.message || "Store approval in progress. You can use promo code 'ILOVEQURAN' for instant test access!",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.info(`Checkout in Preview Mode`, {
        description: "Store verification in progress. Enter promo code 'ILOVEQURAN' or 'TALIB' to unlock top tier access immediately!",
        duration: 6000,
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const FAQS = [
    {
      q: "Do I get a discount or student/scholar financial aid?",
      a: "Yes! We offer student discounts, scholar concessions, and financial assistance vouchers. Please contact us on WhatsApp / Phone at +92 309 085 2727 or email us at aljuthur@gmail.com to receive your custom discount access code.",
    },
    {
      q: "What makes Al-Juthur different from regular Quran apps?",
      a: "Standard Quran apps separate translations, dictionaries, and commentaries. Al-Juthur unifies everything into a single scholarly workspace: every word connects directly to 13 historical Arabic lexicons (such as Lane's Lexicon & Lisan al-Arab), 130+ Tafsirs across 33 languages, and a 6-Mode Academic AI Scholar for grammar (Sarf & I'rab), historical context (Asbab al-Nuzul), and comparative tafsir synthesis.",
    },
    {
      q: "Is core Quran reading and translation 100% free?",
      a: "Yes. Reading all 6,236 Ayahs across 9 authentic Mushaf scripts, 127 translations, word-by-word breakdowns, audio recitations, and classic Tafsirs (like Ibn Kathir and As-Sa'di) is 100% free forever. Paid plans solely support high-performance AI GPU compute and ongoing database curation.",
    },
    {
      q: "How accurate is the AI Scholar & Translation engine?",
      a: "Our AI Scholar uses a dual-agent Retrieval-Augmented Generation (RAG) pipeline grounded in authoritative classical dictionaries and tafsirs to deliver high scholarly accuracy. While optimized for rigorous scholarship, outputs serve as research aids and should be verified with qualified human scholars (Ulama) for religious decrees.",
    },
    {
      q: "Can I cancel anytime, and how does the 7-Day Money-Back Guarantee work?",
      a: "You can cancel your subscription at any time with one click and keep full access until your billing cycle ends. If you are not satisfied within your first 7 days, email us at aljuthur@gmail.com or message our support for a 100% full refund with zero hassle.",
    },
    {
      q: "What is the Patron / Waqf tier?",
      a: "When you subscribe as a Patron, you receive 150 daily AI queries, priority processing, a free Pro gift account for a friend or student, and directly sponsor computational research access for students of Islamic knowledge worldwide.",
    },
    {
      q: "What payment methods are supported?",
      a: "We accept all major Credit/Debit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and PayPal globally via our secure checkout.",
    },
  ];

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090e0b] border border-emerald-500/20 shadow-2xl shadow-emerald-950/40 text-slate-100 overflow-hidden"
        >
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-20 cursor-pointer border border-white/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content Container */}
          <div className="overflow-y-auto p-5 sm:p-8 lg:p-10 space-y-8 custom-scrollbar">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scholarly Research Plans</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-serif">
                Deepen Your Study of the <span className="text-emerald-400">Holy Qur'an</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                Unlock multi-scholar synthesis, 13 historical lexicons, and 6-mode academic AI analysis.
              </p>

              {/* Billing Cycle Switcher */}
              <div className="pt-3 flex items-center justify-center">
                <div className="inline-flex items-center p-1 rounded-2xl bg-[#121c16] border border-emerald-500/20 shadow-inner">
                  <button
                    onClick={() => {
                      setBillingCycle("monthly");
                      store.setBillingCycle("monthly");
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      billingCycle === "monthly"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => {
                      setBillingCycle("yearly");
                      store.setBillingCycle("yearly");
                    }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      billingCycle === "yearly"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>Yearly</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Current Active Plan Badge (if Pro or Patron) */}
            {currentTier !== "FREE" && (
              <div className="max-w-md mx-auto p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-emerald-400" />
                  <span>
                    Current Plan: <strong className="text-white uppercase">{currentTier}</strong>
                  </span>
                </div>
                {store.activePromoCode && (
                  <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] border border-emerald-500/30">
                    Promo: {store.activePromoCode}
                  </span>
                )}
              </div>
            )}

            {/* 3-Tier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-2">
              {/* TIER 1: FREE */}
              <div className="relative flex flex-col justify-between rounded-3xl p-6 bg-[#0f1712] border border-white/5 hover:border-emerald-500/20 transition-all">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Free</h3>
                    <p className="text-xs text-slate-400">For daily recitation & basic inquiry</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-400">/ forever</span>
                  </div>

                  <hr className="border-white/5" />

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Full 3D Reader & 6,236 Ayahs</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>127 Translations & Word-by-Word</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-emerald-300">Surah Al-Fatihah Free</strong> on all 130+ Tafsirs
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>3 Core Classics (Ibn Kathir En/Ar/Ur, Jalalayn, As-Sa'di)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">5 AI Queries</strong> per day
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Al-Mufradat & Root Summary Lexicon</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectPlan("FREE")}
                    disabled={currentTier === "FREE"}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
                      currentTier === "FREE"
                        ? "bg-white/5 text-slate-400 cursor-default border border-white/5"
                        : "bg-white/10 hover:bg-white/15 text-white cursor-pointer"
                    }`}
                  >
                    {currentTier === "FREE" ? "Current Active Plan" : "Downgrade to Free"}
                  </button>
                </div>
              </div>

              {/* TIER 2: PRO (Featured) */}
              <div className="relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 bg-[#111d16] border-2 border-emerald-500 shadow-xl shadow-emerald-950/60 transition-all scale-[1.02] z-10">
                {/* Popular Pill */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-emerald-500 text-emerald-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Most Popular</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Pro</span>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Bahith
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">For students of knowledge & researchers</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                      {billingCycle === "monthly" ? "$3.99" : "$39"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {billingCycle === "monthly" ? "/ month" : "/ year ($3.25/mo)"}
                    </span>
                  </div>

                  <hr className="border-emerald-500/20" />

                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-emerald-300">50 AI Queries / day</strong> (1,200/mo)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong className="text-white">Multiple Powerful Advanced AI Models</strong></span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>All <strong className="text-white">130+ Classical Tafsirs</strong> in 33 languages (Unlocked)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>All <strong className="text-white">13 Historical Lexicons</strong> & PDF Viewers (Unlocked)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Full Grammar & Syntax (I'rab & Sarf) Mode</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Export Research Notes (Styled PDF & MD)</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectPlan("PRO")}
                    disabled={checkoutLoading === "PRO" || currentTier === "PRO"}
                    className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      currentTier === "PRO"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 shadow-emerald-950/50"
                    }`}
                  >
                    {checkoutLoading === "PRO" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Checkout...</span>
                      </>
                    ) : currentTier === "PRO" ? (
                      "Current Active Plan"
                    ) : (
                      <>
                        <span>Upgrade to Pro</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TIER 3: PATRON / VIP */}
              <div className="relative flex flex-col justify-between rounded-3xl p-6 bg-[#0f1712] border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Patron</span>
                      <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Supporter Tier
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">Scholars, Teachers & Community Benefactors</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white">
                      {billingCycle === "monthly" ? "$9.99" : "$99"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {billingCycle === "monthly" ? "/ month" : "/ year ($8.25/mo)"}
                    </span>
                  </div>

                  <hr className="border-white/5" />

                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-300">150 AI Queries / day</strong> (3,500/mo)
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">Priority AI Processing Queue</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Gift className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-emerald-300">
                        <strong>🎁 Gift a Friend:</strong> Includes 1 Free Pro Account for a friend or student
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Includes all Pro Features & 13 Lexicons</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Distinguished Patron Profile Badge</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Early access to upcoming AI modes</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectPlan("PATRON")}
                    disabled={checkoutLoading === "PATRON" || currentTier === "PATRON"}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      currentTier === "PATRON"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 shadow-md shadow-amber-950/40"
                    }`}
                  >
                    {checkoutLoading === "PATRON" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Checkout...</span>
                      </>
                    ) : currentTier === "PATRON" ? (
                      "Current Active Plan"
                    ) : (
                      <>
                        <span>Become a Patron</span>
                        <Crown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Promo Code & Scholar Discount Section */}
            <div className="max-w-xl mx-auto pt-2">
              {!showPromoInput ? (
                <button
                  onClick={() => setShowPromoInput(true)}
                  className="mx-auto flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Have a Scholar / Waqf Access Code? Click here to redeem</span>
                </button>
              ) : (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleApplyPromo}
                  className="p-4 rounded-2xl bg-[#121d17] border border-emerald-500/25 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs text-emerald-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Enter Access / Promo Code
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPromoInput(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. ILOVEQURAN, SCHOLAR100"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 uppercase tracking-widest font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingPromo || !promoCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isApplyingPromo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Redeem</span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Valid promo codes grant 100% free lifetime or trial access to Pro / Patron tiers.
                  </p>
                </motion.form>
              )}
            </div>

            {/* FAQ Accordion */}
            <div className="max-w-3xl mx-auto pt-6 border-t border-white/5 space-y-3">
              <h4 className="text-sm font-bold text-slate-200 text-center flex items-center justify-center gap-1.5 pb-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Frequently Asked Questions
              </h4>
              <div className="space-y-2">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-3.5 text-left text-xs sm:text-sm font-medium text-slate-200 flex items-center justify-between gap-3 hover:bg-white/[0.02] cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-emerald-400" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3.5 pb-3.5 text-xs text-slate-400 leading-relaxed"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Trust Guarantee */}
            <div className="text-center pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Encrypted Global Payments · Cancel anytime with 1-click</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
