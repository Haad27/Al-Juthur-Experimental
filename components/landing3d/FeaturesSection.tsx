'use client'

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BookOpen, Library, BookText, Brain, Bot } from "lucide-react";

const features = [
  {
    title: "Basic Quran with Lexicon",
    description: "Explore the Quran deeply with integrated lexical analysis. Tap into root words, morphological breakdown, and classical meanings seamlessly as you read.",
    image: "/images/features/qura-view.png",
    icon: <BookOpen className="w-8 h-8 text-emerald-400" />,
    color: "emerald"
  },
  {
    title: "110+ Classical & Modern Tafsirs",
    description: "Dive into centuries of Islamic scholarship. Access a vast library of over 110 exegeses ranging from early classical works to contemporary interpretations, all beautifully formatted.",
    image: "/images/features/tafsir.png",
    icon: <Library className="w-8 h-8 text-blue-400" />,
    color: "blue"
  },
  {
    title: "8+ Classical Lexicons",
    description: "Uncover the precise linguistic nuances with access to more than 8 authoritative classical Arabic lexicons, perfectly synchronized with your reading.",
    image: "/images/features/lexicon.png",
    icon: <BookText className="w-8 h-8 text-purple-400" />,
    color: "purple"
  },
  {
    title: "AI Translation for Accurate Tafsir",
    description: "Leverage advanced AI translation tailored specifically for classical Arabic to understand complex, archaic Tafsir texts with unprecedented accuracy and clarity.",
    image: "/images/features/ai trnalsation.png",
    icon: <Brain className="w-8 h-8 text-rose-400" />,
    color: "rose"
  },
  {
    title: "6 RAG Modes",
    description: "Utilize Retrieval-Augmented Generation (RAG) across 6 distinct modes to intelligently search, summarize, and synthesize Islamic knowledge from massive datasets instantly.",
    image: "/images/features/6 rag modes.png",
    icon: <Bot className="w-8 h-8 text-amber-400" />,
    color: "amber"
  },
];

const FeatureBlock = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const isEven = index % 2 === 0;

  // Parallax and fade effects
  const yImage = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  const glowColorMap: Record<string, string> = {
    emerald: "bg-emerald-500/20",
    blue: "bg-blue-500/20",
    purple: "bg-purple-500/20",
    rose: "bg-rose-500/20",
    amber: "bg-amber-500/20"
  };

  const borderColorMap: Record<string, string> = {
    emerald: "border-emerald-500/30",
    blue: "border-blue-500/30",
    purple: "border-purple-500/30",
    rose: "border-rose-500/30",
    amber: "border-amber-500/30"
  };

  return (
    <div ref={ref} className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-24">
      {/* Dynamic Background Glow */}
      <motion.div 
        style={{ opacity }}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[150px] rounded-full pointer-events-none ${glowColorMap[feature.color]}`} 
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full">
        <div className={`flex flex-col gap-12 md:gap-24 items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
          
          {/* Text Side */}
          <motion.div 
            style={{ opacity }}
            className="w-full md:w-1/2 space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black/50 backdrop-blur-xl border ${borderColorMap[feature.color]} shadow-2xl`}
            >
              {feature.icon}
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, x: isEven ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter leading-[1.1]"
            >
              {feature.title}
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-xl"
            >
              {feature.description}
            </motion.p>
          </motion.div>

          {/* Image Side with Parallax */}
          <div className="w-full md:w-1/2 relative">
            <motion.div 
              style={{ y: yImage, scale, opacity }}
              className="relative w-full aspect-[4/3] md:aspect-[3/4] lg:aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group"
            >
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/10 pointer-events-none z-10" />
              
              <img 
                src={feature.image} 
                alt={feature.title} 
                className="w-full h-full object-cover transform scale-110" // scale slightly to hide parallax edges
              />
              
              {/* Inner border glow */}
              <div className={`absolute inset-0 border-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-20 ${borderColorMap[feature.color]}`} />
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default function FeaturesSection() {
  return (
    <section className="relative w-full bg-black">
      {/* Section Divider */}
      <div className="w-full h-32 bg-gradient-to-b from-black via-black to-transparent pointer-events-none z-20 -mt-32 relative" />
      
      {features.map((feature, index) => (
        <FeatureBlock key={index} feature={feature} index={index} />
      ))}
    </section>
  );
}
