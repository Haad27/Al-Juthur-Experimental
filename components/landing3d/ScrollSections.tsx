"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, BookOpen, Library, BookText, BrainCircuit, Languages } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

/**
 * HTML content sections stacked in normal document flow above the fixed Canvas.
 * Each section fades in/out with GSAP ScrollTrigger as it enters the viewport.
 * Alternates left/right positioning for visual rhythm.
 */

interface SectionData {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  align: "left" | "right";
}

const SECTIONS: SectionData[] = [
  {
    id: "quran-view",
    icon: <BookOpen className="w-6 h-6" />,
    title: "The Mushaf",
    subtitle: "Full Reading Experience",
    description:
      "Navigate the Quran verse by verse with a pristine and immersive interface. Beautiful Arabic typography with smooth navigation that feels completely natural.",
    accentColor: "#6df4ce",
    align: "left",
  },
  {
    id: "tafsirs",
    icon: <Library className="w-6 h-6" />,
    title: "120+ Tafsirs",
    subtitle: "Classical & Contemporary",
    description:
      "Access over 120 tafsir sources organized by era and methodology. From the classical works of Ibn Kathir to modern scholarly interpretations.",
    accentColor: "#6df4ce",
    align: "right",
  },
  {
    id: "lexicon",
    icon: <BookText className="w-6 h-6" />,
    title: "13 Classical Lexicons",
    subtitle: "Root Word Morphology",
    description:
      "Dive into root word morphology and meaning sourced from Lisan al Arab, Mufradat al Raghib and more. Understand every word at its deepest level.",
    accentColor: "#6df4ce",
    align: "left",
  },
  {
    id: "rag-ai",
    icon: <BrainCircuit className="w-6 h-6" />,
    title: "RAG AI",
    subtitle: "6 Specialized Modes",
    description:
      "Our AI model is trained directly on classical tafsir and lexicons to answer precise questions. Get intelligent answers backed by traditional scholarly sources.",
    accentColor: "#6df4ce",
    align: "right",
  },
  {
    id: "ai-translation",
    icon: <Languages className="w-6 h-6" />,
    title: "AI Translation",
    subtitle: "Precision Meets Clarity",
    description:
      "Classical Arabic rendered into clear modern language without losing precision. Every nuance preserved and every meaning made accessible.",
    accentColor: "#6df4ce",
    align: "left",
  },
];

function FeatureCard({ section }: { section: SectionData }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          y: 50,
          x: section.align === "left" ? -30 : 30,
        },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 85%",
            end: "bottom 15%",
            toggleActions: "play reverse play reverse",
          },
        }
      );
    });

    return () => ctx.revert();
  }, [section.align]);

  return (
    <div
      ref={cardRef}
      className={`
        flex items-center w-full max-w-7xl mx-auto px-4 md:px-8
        ${section.align === "left" ? "justify-start" : "justify-end"}
      `}
      style={{ opacity: 0 }}
    >
      <div
        className="
          relative max-w-md p-6 md:p-8 rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-emerald-500/20
          shadow-[0_0_30px_rgba(109,244,206,0.05)]
        "
      >
        {/* Subtle gradient glow behind card */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Icon + Subtitle row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {section.icon}
            </div>
            <span className="text-xs uppercase tracking-widest text-emerald-400/70 font-medium">
              {section.subtitle}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
            {section.title}
          </h3>

          {/* Description */}
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-light">
            {section.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctaRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 75%",
            end: "top 35%",
            toggleActions: "play reverse play reverse",
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ctaRef}
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ opacity: 0 }}
    >
      <div className="mb-8">
        <img
          src="/assets/favicon/apple-touch-icon.png"
          alt="Al Juthur"
          className="w-16 h-16 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(241,245,249,0.35)]"
        />
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Start Your Journey
        </h2>
        <p className="text-base md:text-lg text-zinc-400 max-w-lg mx-auto font-light leading-relaxed">
          The most comprehensive Qur'anic study platform. 120+ Tafsirs in 33 languages, 13 Lexicons, 127 Translations, and AI-powered insights.
        </p>
      </div>

      <Link
        href="/home"
        className="
          group relative inline-flex items-center gap-3
          px-8 py-4 md:px-12 md:py-5
          bg-emerald-500/15 hover:bg-emerald-500/25
          backdrop-blur-xl
          text-emerald-400 hover:text-emerald-300
          rounded-full font-semibold text-base md:text-xl
          transition-all duration-500
          border border-emerald-500/40 hover:border-emerald-400/60
          hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]
        "
      >
        Start Using It
        <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

// Bouncing scroll indicator
function ScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
      <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
        Scroll
      </span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-400/60"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function ScrollSections() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Refresh ScrollTrigger after mount to ensure correct measurements
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-10 pointer-events-none">
      {/* Hero spacer — matches the hero viewport height */}
      <section className="relative h-screen flex items-end justify-center">
        <ScrollIndicator />
      </section>

      {/* Feature sections */}
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="relative flex items-center pointer-events-auto"
          style={{ minHeight: "120vh" }}
        >
          <FeatureCard section={section} />
        </section>
      ))}

      {/* Final CTA Section */}
      <section
        id="final-cta"
        className="relative flex items-center justify-center pointer-events-auto"
        style={{ minHeight: "100vh" }}
      >
        <FinalCTA />
      </section>
    </div>
  );
}
