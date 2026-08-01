"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoIcon from "@/components/svg/icons/LogoIcon";
import {
  Sparkles,
  BookOpen,
  Layers,
  ShieldAlert,
  Database,
  ArrowRight,
  AlertTriangle,
  Info
} from "lucide-react";
import { inter } from "@/app/fonts";
import { RAG_MODES } from "@/lib/ai/rag/modes-config";
import Loading from "@/app/loading";

export default function RagLandingPage() {
  const router = useRouter();
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [isLoadingMode, setIsLoadingMode] = useState(false);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-slate-100 flex flex-col pb-16 ${inter.className}`}>
      {/* Global Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-zinc-950/40 border-b border-zinc-800/80 px-4 md:px-8 py-3">
        <div className="max-w-[1700px] mx-auto relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/home" className="flex items-center gap-2 shrink-0">
              <LogoIcon className="w-8 h-8 rounded-[20%]" />
              <span className="font-bold text-lg sm:text-xl tracking-tight text-white whitespace-nowrap">Al-Juthur</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 text-zinc-400 text-sm font-medium">
            <Link href="/home" className="hover:text-zinc-200 transition">
              Home
            </Link>
            <Link href="/tafsir" className="hover:text-zinc-200 transition">
              Tafsir
            </Link>
            <Link href="/lexicon" className="hover:text-zinc-200 transition">
              Lexicon
            </Link>
            <Link href="/ai" className="hover:text-zinc-200 transition">
              AI Translator
            </Link>
            <Link href="/rag" className="text-white font-bold">
              RAG Bot
            </Link>
          </nav>

          {/* Action Button: How RAG Works Drawer Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDataInfo(!showDataInfo)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 font-medium shadow-sm"
              title="How the RAG Engine Searches & Synthesizes Data"
            >
              <Info className="size-3.5 text-emerald-400" />
              <span>How RAG Works</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        
        {/* Compact Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>Multi-Modal Hybrid Retrieval Engine (BM25 + Semantic Vectors)</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Scholarly RAG Retrieval Hub
          </h1>
          
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto">
            Retrieval-Augmented Generation isolated to classical Tafsirs &amp; lexicons with verified citations. Select one of the 6 specialized modes below to begin inquiring.
          </p>
        </div>

        {/* Add Data Drawer / Section */}
        {showDataInfo && (
          <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-emerald-500/30 rounded-2xl p-5 md:p-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="size-4 text-emerald-400" />
                <span>How the RAG System Indexes &amp; Adds Data</span>
              </h3>
              <button 
                onClick={() => setShowDataInfo(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Close Panel
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Our RAG engine combines <strong className="text-emerald-400">BM25 / FTS5 lexical keyword indexing</strong> with <strong className="text-emerald-400">offline deterministic semantic embeddings</strong>. When you query any mode, the system runs a 3-stage pipeline:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 1: Query Router</span>
                <p className="text-zinc-400 text-[11px]">Extracts roots and converts query into classical Arabic terms.</p>
              </div>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 2: RRF Retrieval</span>
                <p className="text-zinc-400 text-[11px]">Searches strictly within allowed author texts &amp; dictionary IDs.</p>
              </div>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="font-semibold text-emerald-400 block">Stage 3: Grounded Output</span>
                <p className="text-zinc-400 text-[11px]">Synthesizes answers strictly from retrieved passages with citations.</p>
              </div>
            </div>
          </div>
        )}

        {/* Modes Grid Section (Compact & Instantly Visible) */}
        <div id="modes-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Select a Specialized Retrieval Mode</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
              <ShieldAlert className="size-3.5 text-amber-400" />
              <span>Built-in Domain Guardrails</span>
            </div>
          </div>

          {/* 6 Mode Containers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {RAG_MODES.map((mode) => (
              <div
                key={mode.id}
                className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-emerald-500/5 relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Badge & Title */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                    {mode.name}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {mode.description}
                  </p>

                  {/* Target User Intent */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 block">
                      Target Intent
                    </span>
                    <p className="text-xs text-zinc-300 font-medium truncate">
                      {mode.targetIntent}
                    </p>
                  </div>

                  {/* Sources List */}
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 block flex items-center gap-1">
                      <BookOpen className="size-3 text-emerald-500" />
                      <span>Sources ({mode.sources.length})</span>
                    </span>
                    <ul className="space-y-1">
                      {mode.sources.slice(0, 3).map((src, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex items-center gap-1.5 truncate">
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{src}</span>
                        </li>
                      ))}
                      {mode.sources.length > 3 && (
                        <li className="text-[10px] text-zinc-500 italic pl-3">
                          + {mode.sources.length - 3} more sources
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Mode Warning Box (if applicable) */}
                  {mode.warning && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 space-y-0.5 mt-2">
                      <div className="flex items-center gap-1 font-bold text-amber-300 text-[11px]">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>Scope Guardrail</span>
                      </div>
                      <p className="leading-relaxed opacity-90 text-[10px] truncate">
                        {mode.warning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Launch Button */}
                <div className="pt-4 mt-4 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      setIsLoadingMode(true);
                      router.push(`/rag/chat?mode=${mode.id}`);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-between transition-all duration-200 shadow-sm group/btn"
                  >
                    <span className="truncate">Launch {mode.shortName}</span>
                    <ArrowRight className="size-3.5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Disclaimer Banner */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 text-center max-w-3xl mx-auto">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            <strong className="text-zinc-300">Scholarly Transparency Guarantee:</strong> This RAG Engine synthesizes answers strictly from classical commentaries and lexicons with verified citations. Always verify personal legal matters with certified local scholars.
          </p>
        </div>

      </main>
      
      {/* Loading Overlay when switching models */}
      {isLoadingMode && <Loading />}
    </div>
  );
}
