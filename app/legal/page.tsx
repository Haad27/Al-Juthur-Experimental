"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  FileText, 
  RefreshCcw, 
  ArrowLeft, 
  Mail, 
  Sparkles, 
  Scale, 
  BookOpen, 
  Lock, 
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LegalTab = "terms" | "privacy" | "refund";

function LegalContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "terms" || tabParam === "privacy" || tabParam === "refund") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs: { key: LegalTab; label: string; icon: React.ReactNode }[] = [
    { key: "terms", label: "Terms of Service", icon: <FileText className="w-4 h-4" /> },
    { key: "privacy", label: "Privacy Policy", icon: <ShieldCheck className="w-4 h-4" /> },
    { key: "refund", label: "Refund & Cancellation", icon: <RefreshCcw className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Decorative Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-emerald-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/home"
            className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors text-sm font-medium group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Al-Juthur</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Legal Center
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Page Hero Header */}
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex flex-col sm:flex-row sm:items-center gap-2">
            <span>Al-Juthur Legal Center</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
            Review our platform terms, privacy commitments, and subscription policies. All rights, research integrity, and personal privacy are fully protected.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap p-1.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-xl gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
                  isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="legal-tab-active-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-950/50 border border-emerald-400/30"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Policy Content Container */}
        <div className="p-6 sm:p-10 rounded-3xl bg-zinc-900/50 border border-zinc-800/70 shadow-2xl backdrop-blur-md">
          <AnimatePresence mode="wait">
            {/* ========================================================================= */}
            {/* TAB 1: TERMS OF SERVICE */}
            {/* ========================================================================= */}
            {activeTab === "terms" && (
              <motion.div
                key="terms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 leading-relaxed text-zinc-300 text-sm sm:text-base"
              >
                <div className="border-b border-zinc-800 pb-5">
                  <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
                    <FileText className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-widest font-mono font-bold">Terms of Service</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Terms of Service</h2>
                  <p className="text-xs text-zinc-500 mt-1">Last Updated: August 2026</p>
                </div>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    1. Acceptance of Terms
                  </h3>
                  <p>
                    By accessing or using <strong className="text-zinc-100">Al-Juthur (الجذور)</strong>—accessible via our web application, progressive web app (PWA), and associated APIs—you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue use of the platform.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    2. Description of the Platform & Services
                  </h3>
                  <p>
                    Al-Juthur is an advanced classical and AI-powered Qur'anic research platform offering:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-300 text-sm">
                    <li>Digital Holy Qur'an text, word-by-word morphological breakdowns, and authenticated recitations.</li>
                    <li>Over 130 classical and contemporary Tafsir works across 33 languages.</li>
                    <li>12+ historical Arabic lexicons and dictionaries (including Lane's Lexicon, Lisan al-Arab, and Mufradat Alfaz al-Quran).</li>
                    <li>Academic AI research assistance (AI Scholar, translation transcreation, and 6-mode Retrieval-Augmented Generation).</li>
                  </ul>
                </section>

                {/* Important Scholarly & AI Disclaimer */}
                <section className="space-y-3 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200">
                  <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    3. Important Islamic Scholarly & AI Disclaimer
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm text-amber-200/90 leading-normal">
                    <p>
                      <strong>Educational & Research Purpose:</strong> All materials, classical lexicons, and commentaries on Al-Juthur are provided solely for educational, linguistic, and research purposes.
                    </p>
                    <p>
                      <strong>AI Accuracy & Reliability:</strong> Our AI translation and RAG engine are computationally optimized to produce close-to-perfect and highly accurate results across Qur'anic linguistic contexts. However, because these features rely on artificial intelligence models, occasional minor errors or inaccuracies are to be expected. While we secure most results with high accuracy, outputs are not infallible.
                    </p>
                    <p>
                      <strong>AI Outputs are Not Religious Rulings (Fatwas):</strong> Answers generated by the AI Scholar or RAG engine do <u>not</u> constitute authoritative Islamic legal fatwas, binding religious decrees, or definitive theological rulings. Users must consult qualified human Islamic scholars (<em>Ulama</em>) for religious and legal determinations.
                    </p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">4. User Accounts & Fair Usage</h3>
                  <p>
                    You agree to use Al-Juthur only for lawful research and personal study. You shall not:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-sm text-zinc-300">
                    <li>Engage in automated scraping, data harvesting, or mass extraction of our databases and root lexicons.</li>
                    <li>Abuse, overload, or launch denial-of-service attacks against our APIs, database servers, or AI endpoints.</li>
                    <li>Attempt to reverse-engineer, decompile, or bypass rate limits and subscription barriers.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">5. Subscriptions & Billing</h3>
                  <p>
                    Al-Juthur offers free core study access as well as premium subscription tiers (<strong>Pro</strong> and <strong>Patron</strong>) providing expanded AI quotas, high-definition offline assets, and advanced research features.
                  </p>
                  <p className="text-sm text-zinc-400">
                    All payment processing is handled securely through our authorized global payment processors. Prices are quoted in USD (or local equivalent) and renewals occur automatically unless cancelled prior to the renewal date.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">6. Intellectual Property</h3>
                  <p>
                    <strong>Classical & Open Knowledge:</strong> Classical Arabic texts, Quranic verses, and public-domain lexicons remain in the public domain.
                  </p>
                  <p>
                    <strong>Platform Rights:</strong> The Al-Juthur software code, 3D visualization engines, database indexes, logo, UI/UX design, and proprietary implementations remain the intellectual property of Al-Juthur.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">7. Limitation of Liability</h3>
                  <p>
                    Al-Juthur is provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by applicable law, Al-Juthur and its maintainers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use of or inability to use the platform.
                  </p>
                </section>

                <section className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-400">
                  <p>Questions regarding our Terms of Service?</p>
                  <a
                    href="mailto:aljuthur@gmail.com"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    aljuthur@gmail.com
                  </a>
                </section>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PRIVACY POLICY */}
            {/* ========================================================================= */}
            {activeTab === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 leading-relaxed text-zinc-300 text-sm sm:text-base"
              >
                <div className="border-b border-zinc-800 pb-5">
                  <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-widest font-mono font-bold">Privacy Policy</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
                  <p className="text-xs text-zinc-500 mt-1">Last Updated: August 2026</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-200">All Rights & Privacy are Fully Protected:</strong> We respect your personal data. Al-Juthur does not sell, rent, or monetize your personal information or search queries to third parties.
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    1. Information We Collect
                  </h3>
                  <p>We collect only the essential data necessary to deliver your personalized research experience:</p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-zinc-300">
                    <li><strong className="text-zinc-200">Account Credentials:</strong> Email address and username when you create an account or subscribe to a plan.</li>
                    <li><strong className="text-zinc-200">Study Preferences:</strong> Bookmarked Ayahs, saved notes, custom search history, and reciter audio configurations.</li>
                    <li><strong className="text-zinc-200">AI Interactions:</strong> Search queries submitted to the AI Scholar and RAG endpoints to fetch relevant commentaries and verses.</li>
                    <li><strong className="text-zinc-200">Technical Analytics:</strong> Anonymized diagnostic logs and browser metadata used strictly to ensure platform reliability and security.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">2. How We Use Your Information</h3>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-zinc-300">
                    <li>To synchronize your reading progress, notes, and preferences across devices.</li>
                    <li>To execute server-side AI retrieval and provide contextually accurate scholarly answers.</li>
                    <li>To verify subscription status and provide account customer support.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">3. Payment Information Security</h3>
                  <p>
                    All payment processing for Al-Juthur is handled directly by authorized, PCI-DSS compliant global payment processors.
                  </p>
                  <p className="text-sm text-zinc-400">
                    <strong>Al-Juthur never collects, stores, or transmits your credit card numbers or payment credentials on our servers.</strong>
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">4. Cookies & Local Storage</h3>
                  <p>
                    We use browser Local Storage and essential cookies to store your client-side interface settings, such as your chosen Arabic Mushaf font, font scale, word-by-word display preference, and dark mode state. These are stored locally on your device.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">5. Data Subject Rights & Deletion</h3>
                  <p>
                    You have complete control over your data. All rights and privacy are fully protected. You may request an export of your saved data or a permanent deletion of your account and all associated records at any time by contacting our team.
                  </p>
                </section>

                <section className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-400">
                  <p>For privacy inquiries or data deletion requests:</p>
                  <a
                    href="mailto:aljuthur@gmail.com"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    aljuthur@gmail.com
                  </a>
                </section>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: REFUND & CANCELLATION POLICY */}
            {/* ========================================================================= */}
            {activeTab === "refund" && (
              <motion.div
                key="refund"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 leading-relaxed text-zinc-300 text-sm sm:text-base"
              >
                <div className="border-b border-zinc-800 pb-5">
                  <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
                    <RefreshCcw className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-widest font-mono font-bold">Refund & Cancellation</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Refund and Cancellation Policy</h2>
                  <p className="text-xs text-zinc-500 mt-1">Last Updated: August 2026</p>
                </div>

                {/* 7-Day Money Back Guarantee Highlight */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-emerald-500/30 text-zinc-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <Sparkles className="w-5 h-5" />
                    <span>7-Day Money-Back Guarantee</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300">
                    We want you to be completely satisfied with Al-Juthur Pro and Patron tiers. If you are not satisfied with your purchase for any reason, you are eligible for a <strong>100% full refund within 7 days</strong> of your initial subscription payment.
                  </p>
                </div>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">1. Cancellation Policy</h3>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-zinc-300">
                    <li><strong>Cancel Anytime:</strong> You can cancel your subscription renewal at any time directly through your account billing portal.</li>
                    <li><strong>Continuous Access:</strong> When you cancel, your premium benefits remain fully active until the conclusion of your current prepaid billing period.</li>
                    <li><strong>No Hidden Fees:</strong> There are no cancellation penalties or early termination fees.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">2. Refund Terms & Eligibility</h3>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-zinc-300">
                    <li>
                      <strong className="text-zinc-200">Initial Subscriptions:</strong> Full refund requested within <strong>7 days</strong> of initial purchase.
                    </li>
                    <li>
                      <strong className="text-zinc-200">Annual Plan Renewals:</strong> If your annual subscription renews automatically and you did not intend to renew, you can request a full refund within <strong>48 to 72 hours</strong> of the renewal charge.
                    </li>
                    <li>
                      <strong className="text-zinc-200">Technical Issues:</strong> If a technical issue on our end prevents you from using paid features and our support team cannot resolve it, you are entitled to a full refund.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">3. How to Request a Refund</h3>
                  <p className="text-sm">
                    To request a refund, simply send an email from your registered account email to:
                  </p>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-zinc-400">Support & Billing Contact:</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm">aljuthur@gmail.com</p>
                    </div>
                    <a
                      href="mailto:aljuthur@gmail.com?subject=Refund%20Request%20-%20Al-Juthur"
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs transition-colors"
                    >
                      Send Request
                    </a>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Please include your subscription email and order number / transaction ID. Our billing team will review and process your request within <strong>3 to 5 business days</strong>.
                  </p>
                </section>

                <section className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-400">
                  <p>All rights, security, and privacy are fully protected under Al-Juthur policies.</p>
                  <a
                    href="mailto:aljuthur@gmail.com"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono font-medium"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    aljuthur@gmail.com
                  </a>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/90 py-8 px-4 text-center text-xs text-zinc-600">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Al-Juthur (الجذور). Dedicated to authentic Qur'anic research.</p>
          <div className="flex items-center gap-4 text-zinc-500">
            <button onClick={() => setActiveTab("terms")} className="hover:text-zinc-300 transition-colors">Terms</button>
            <span>•</span>
            <button onClick={() => setActiveTab("privacy")} className="hover:text-zinc-300 transition-colors">Privacy</button>
            <span>•</span>
            <button onClick={() => setActiveTab("refund")} className="hover:text-zinc-300 transition-colors">Refunds</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">Loading legal policies...</div>}>
      <LegalContent />
    </Suspense>
  );
}
