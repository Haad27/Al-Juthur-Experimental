"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Layers,
  ShieldAlert,
  CheckCircle2,
  Database,
  ArrowRight,
  Info,
  Scale,
  FileText,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { inter, amiri } from "@/app/fonts";
import { RAG_MODES } from "@/lib/ai/rag/modes-config";

export default function RagLandingPage() {
  const router = useRouter();
  const [showDataInfo, setShowDataInfo] = useState(false);

  return (
    <div className={`min-h-screen bg-zinc-950 text-white flex flex-col ${inter.className}`}>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-4">
        <div className="max-w-[1250px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-sm font-medium transition-all text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>Back Home</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800 hidden md:block mx-2" />
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-500" />
              <span className="font-bold text-base md:text-lg tracking-tight">Quranic RAG System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tafsir"
              className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <BookOpen className="size-3.5" />
              <span>Tafsir Library</span>
            </Link>
            <Link
              href="/lexicon"
              className="px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Layers className="size-3.5" />
              <span>Root Lexicon</span>
            </Link>
            <button
              onClick={() => setShowDataInfo(!showDataInfo)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 font-medium"
            >
              <Database className="size-3.5" />
              <span>Add / Index Data</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1250px] w-full mx-auto px-4 md:px-8 py-10 md:py-16 space-y-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-emerald-400 shadow-inner">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Multi-Modal Hybrid Retrieval Engine (BM25 + Semantic Vector)</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent leading-tight">
            Scholarly RAG System & Retrieval Hub
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            A specialized Retrieval-Augmented Generation (RAG) platform designed to extract and synthesize data exclusively from authoritative classical and contemporary scholarship. Select one of our 6 dedicated modes below to begin inquiring with guaranteed transparency and verified source citations.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/rag/chat?mode=default")}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span>Launch Default Mode</span>
              <ArrowRight className="size-4" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("modes-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-medium transition-all"
            >
              Explore All 6 Modes
            </button>
          </div>
        </div>

        {/* Add Data Drawer / Section */}
        {showDataInfo && (
          <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-emerald-500/30 rounded-2xl p-6 md:p-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="size-5 text-emerald-400" />
                <span>How the RAG System Indexes & Adds Data</span>
              </h3>
              <button 
                onClick={() => setShowDataInfo(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Close Panel
              </button>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Our RAG engine combines <strong className="text-emerald-400">BM25 / FTS5 lexical keyword indexing</strong> with <strong className="text-emerald-400">offline deterministic semantic embeddings</strong> (and optional OpenRouter/Gemini vector spaces). When you query any mode, the system runs a 2-stage pipeline:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 1: Light Query Router</span>
                <p className="text-zinc-400">Rewrites your query into classical Arabic terminology, extracts root words, and verifies that the inquiry is valid for the selected mode.</p>
              </div>
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 2: Hybrid RRF Retrieval</span>
                <p className="text-zinc-400">Searches strictly within the allowed Author and Dictionary IDs for the active mode, fusing keyword matches and semantic vectors.</p>
              </div>
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 3: Grounded Synthesis</span>
                <p className="text-zinc-400">Synthesizes answers strictly from retrieved passages, citing the exact book, surah:ayah, or root at the end of every point.</p>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-4">
              <span>Need to index custom classical texts or add new volume chunks?</span>
              <code className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono">
                npx tsx scripts/seed_rag_modes.ts
              </code>
            </div>
          </div>
        )}

        {/* Modes Section */}
        <div id="modes-section" className="space-y-6 pt-4">
          <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800/80">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Select a Specialized Retrieval Mode</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Each mode isolates retrieval to its specific authoritative texts and enforces strict domain boundaries.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 self-start sm:self-auto">
              <ShieldAlert className="size-4 text-amber-400" />
              <span>Built-in Scope Guardrails Enabled</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RAG_MODES.map((mode) => (
              <div
                key={mode.id}
                className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-emerald-500/5 relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Badge & Title */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    {mode.name}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Target User Intent */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-1">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 block">
                      Target User Intent
                    </span>
                    <p className="text-xs text-zinc-300 font-medium">
                      {mode.targetIntent}
                    </p>
                  </div>

                  {/* Sources List */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 block flex items-center gap-1.5">
                      <BookOpen className="size-3 text-emerald-500" />
                      <span>Authoritative Sources Included ({mode.sources.length})</span>
                    </span>
                    <ul className="space-y-1.5">
                      {mode.sources.map((src, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                          <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span className="leading-tight">{src}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mode Warning Box (if applicable) */}
                  {mode.warning && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 space-y-1 mt-3">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>Mode Scope & Guardrail Notice</span>
                      </div>
                      <p className="leading-relaxed opacity-90 text-[11px]">
                        {mode.warning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Launch Button */}
                <div className="pt-6 mt-6 border-t border-zinc-800/80">
                  <button
                    onClick={() => router.push(`/rag/chat?mode=${mode.id}`)}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-emerald-500 group-hover:bg-emerald-500 text-zinc-300 hover:text-white group-hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>Enter {mode.name.split(". ")[1] || mode.name}</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Disclaimer Banner */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 text-center max-w-4xl mx-auto space-y-2">
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            <strong className="text-zinc-300">Scholarly Transparency Guarantee:</strong> This RAG Engine synthesizes answers strictly from the classical commentaries and lexicons listed above. It is engineered to refuse queries outside each mode&apos;s linguistic or theological scope. Always verify critical personal matters and legal fatwas with certified local scholars.
          </p>
        </div>

      </main>
    </div>
  );
}
