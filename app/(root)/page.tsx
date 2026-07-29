'use client'

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Search, BrainCircuit, Globe } from "lucide-react";
import FeaturesSection from "@/components/landing3d/FeaturesSection";

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
  "Homepage",
  "Quran View",
  "Tafsirs",
  "Lexicons",
  "Translation",
  "RAG AI",
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
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-12 lg:p-24">
        
        {/* Header / Hook */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <img src="/assets/favicon/apple-touch-icon.png" alt="Al Juthur Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-emerald-400 drop-shadow-lg">
              Al Juthur
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 font-light drop-shadow-md">
            The most comprehensive platform featuring 130+ Tafsirs, 8+ Lexicons, RAG technology, and AI Translation with a Clean Modern UI.
          </p>
        </motion.div>

        {/* Feature Tags Removed */}

        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-8 flex justify-center md:justify-start pointer-events-auto"
        >
          <Link 
            href="/home" 
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white rounded-full font-bold text-xl transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:shadow-[0_0_40px_rgba(16,185,129,0.8)] border border-emerald-400/30 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Using It
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform duration-300" />
            </span>
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 z-0"></div>
          </Link>
        </motion.div>
      </div>

      {/* Discover More Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.0 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 pointer-events-auto"
        >
          <button 
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            className="group flex flex-col items-center justify-center gap-2 hover:text-emerald-400 transition-colors duration-300"
          >
            <span className="text-sm uppercase tracking-widest font-semibold text-gray-300 group-hover:text-emerald-400">Discover More</span>
            <div className="w-10 h-16 rounded-full border-2 border-gray-500 group-hover:border-emerald-400 flex items-start justify-center p-2 transition-colors duration-300 relative">
              <motion.div 
                animate={{ y: [0, 16, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-1.5 h-3 bg-emerald-500 rounded-full"
              />
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-full shadow-[0_0_15px_rgba(16,185,129,0)] group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-shadow duration-300"></div>
            </div>
          </button>
        </motion.div>
      </section>

      <FeaturesSection />

    </main>
  );
}
