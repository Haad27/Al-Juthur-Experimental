'use client'

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LoadingScreen from "@/components/landing3d/LoadingScreen";

gsap.registerPlugin(ScrollTrigger);

const Scene = dynamic(() => import("@/components/landing3d/Scene"), {
  ssr: false,
});

const ScrollSections = dynamic(() => import("@/components/landing3d/ScrollSections"), {
  ssr: false,
});

const APP_IMAGES = [
  "/images/landing/image1.png",
  "/images/landing/image3.png",
  "/images/landing/image5.png",
  "/images/landing/image8.png",
  "/images/landing/image11.png",
  "/images/landing/image13.png",
];

const APP_CAPTIONS = [
  "Modern Interface",
  "Quran Reader",
  "130+ Tafsirs",
  "12 Classical Lexicons",
  "AI Translation",
  "6 RAG Modes",
];

export default function LandingPage() {
  const router = useRouter();
  const mainRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef<number>(0);

  useEffect(() => {
    // Lock scroll briefly while 3D assets load
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      document.body.style.overflow = "";
    }, 1800);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: mainRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => {
          scrollProgress.current = self.progress;
        },
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  // Hero content fade-out on scroll
  useEffect(() => {
    if (!heroContentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(heroContentRef.current, {
        opacity: 0,
        y: -30,
        ease: "power2.in",
        scrollTrigger: {
          trigger: heroContentRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  const handleDiscoverMore = () => {
    const heroHeight = window.innerHeight;
    window.scrollTo({ top: heroHeight + 10, behavior: "smooth" });
  };

  const handleStartUsingIt = () => {
    router.push("/home");
  };

  return (
    <div ref={mainRef} className="relative w-full bg-black text-white selection:bg-emerald-500/30">
      <LoadingScreen />
      {/* Fixed 3D Canvas — persists behind entire page */}
      <div className="fixed inset-0 z-0">
        <Scene avatars={APP_IMAGES} captions={APP_CAPTIONS} scrollProgress={scrollProgress} />
      </div>

      {/* Hero Overlay — fixed positioned, fades out on scroll */}
      <div
        ref={heroContentRef}
        className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-12 lg:p-24 pb-20 md:pb-12"
      >
        {/* Header / Hook */}
        <div className="max-w-md pointer-events-auto animate-fade-in-left">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/assets/favicon/apple-touch-icon.png"
              alt="Al Juthur Logo"
              className="w-8 h-8 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest uppercase drop-shadow-md">
              Al Juthur
            </h1>
          </div>
          <p className="text-sm md:text-lg text-zinc-300 font-light leading-relaxed">
            The most comprehensive platform featuring 130+ Tafsirs in 33 languages, 127 Translations, 12 Lexicons, RAG technology, and AI Translation with a Clean Modern UI.
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-row gap-3 justify-center md:justify-start pointer-events-auto mb-6 md:mb-0 animate-fade-in-up">
          <button
            onClick={handleStartUsingIt}
            className="group relative inline-flex items-center gap-2 px-4 py-3 md:px-8 md:py-4 bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md text-emerald-400 rounded-full font-semibold text-xs md:text-lg transition-all duration-300 border border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            Start Using It
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleDiscoverMore}
            className="group relative inline-flex items-center gap-2 px-4 py-3 md:px-8 md:py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md text-gray-300 hover:text-white rounded-full font-semibold text-xs md:text-lg transition-all duration-300 border border-white/20 hover:border-white/40"
          >
            Discover More
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Scrollable HTML Content Layer — in normal document flow above canvas */}
      <ScrollSections />
    </div>
  );
}
