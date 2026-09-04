'use client';

import React, { useState } from 'react';
import { ScholarAssistantModal } from '@/components/ai/ScholarAssistantModal';
import { Sparkles, BookOpen, ShieldCheck, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AiScholarPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-foreground transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-amber-500/20 border border-accent/30">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Academic AI Scholar & Quranic Graph-RAG</h1>
              <p className="text-xs text-neutral-400">
                Tafsir Ibn Kathir • Tafsir Al-Jalalayn • Lane's Lexicon • Lisan al-Arab
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent text-foreground text-xs font-semibold shadow-lg  transition"
        >
          <Search className="w-4 h-4" />
          Launch Research Assistant
        </button>
      </header>

      {/* Main Intro Body */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-transparent border border-accent/20 mb-6">
          <BookOpen className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Verifiable Quranic Scholarship via AI
        </h2>
        <p className="text-sm text-neutral-400 max-w-2xl mt-3 leading-relaxed">
          Unlike general LLMs that hallucinate Islamic rulings or quote inaccurate translations, our Academic AI Scholar uses <strong>Parent-Child Semantic Chunking</strong> combined with <strong>Multilingual Hybrid BM25 & Vector Retrieval</strong> to synthesize scholarly consensus with full text integrity.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-10">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-left">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Parent-Child Chunking
            </h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              200-word child chunks ensure precise semantic similarity while retrieving the complete classical Tafsir block so no scholar argument is cut off.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-left">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              On-Demand Translation
            </h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Classical Arabic sources like Tafsir al-Jalalayn and Lisan al-Arab are retrieved in their authentic form and translated inline with exact citations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-left">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Clickable Source Drawer
            </h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Inspect any citation badge to view the original Classical Arabic or English excerpt with exact Surah, Ayah, and Root metadata.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-10 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent hover:from-emerald-500 hover:to-accent text-foreground font-bold text-sm shadow-xl shadow-sm transition transform hover:-translate-y-0.5"
        >
          Open AI Scholar Assistant
        </button>
      </main>

      <ScholarAssistantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
