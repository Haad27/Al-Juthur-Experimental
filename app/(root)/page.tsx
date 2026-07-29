'use client'

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Search, BrainCircuit, Globe } from "lucide-react";
import FeaturesSection from "@/components/landing3d/FeaturesSection";
import AboutAppSection from "@/components/landing3d/AboutAppSection";

const Scene = dynamic(() => import("@/components/landing3d/Scene"), {
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
  "Clean Modern UI",
  "Quran View",
  "130+ Tafsirs",
  "8+ Lexicons",
  "Translate Classical Text",
  "6 AI Models Trained",
];

export default function LandingPage() {
  return (
    <main className="relative w-full bg-black text-white selection:bg-emerald-500/30">
      <section className="relative h-screen w-full overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Scene avatars={APP_IMAGES} captions={APP_CAPTIONS} />
        </div>

        {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-12 lg:p-24">
        
        {/* Header / Hook */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-md pointer-events-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <img src="/assets/favicon/apple-touch-icon.png" alt="Al Juthur Logo" className="w-8 h-8 md:w-12 md:h-12 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest uppercase drop-shadow-md">
              Al Juthur
            </h1>
          </div>
          <p className="text-sm md:text-lg text-zinc-300 font-light leading-relaxed">
            The most comprehensive platform featuring 130+ Tafsirs, 8+ Lexicons, RAG technology, and AI Translation with a Clean Modern UI.
          </p>
        </motion.div>

        {/* Feature Tags Removed */}

        {/* Call to Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 flex flex-row gap-3 justify-center md:justify-start pointer-events-auto"
        >
          <Link 
            href="/home" 
            className="group relative inline-flex items-center gap-2 px-4 py-3 md:px-8 md:py-4 bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md text-emerald-400 rounded-full font-semibold text-xs md:text-lg transition-all duration-300 border border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            Start Using It
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button 
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            className="group relative inline-flex items-center gap-2 px-4 py-3 md:px-8 md:py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md text-gray-300 hover:text-white rounded-full font-semibold text-xs md:text-lg transition-all duration-300 border border-white/20 hover:border-white/40"
          >
            Discover More
          </button>
        </motion.div>
      </div>
      </section>

      <AboutAppSection />

      <FeaturesSection />

    </main>
  );
}
