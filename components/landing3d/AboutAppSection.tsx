'use client'

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { BookOpen, Search, MessageSquare, LineChart, Sparkles } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "Choose a Surah / Ayah",
    description: "Select the verse you want to reflect on from the entire Qur'an.",
    icon: <BookOpen className="w-6 h-6 text-blue-400" />,
    color: "from-blue-500/20 to-blue-900/10",
    border: "border-blue-500/30",
    shadow: "shadow-[0_0_30px_rgba(59,130,246,0.15)]",
    delay: 0.1,
  },
  {
    number: "2",
    title: "Select Lens for Deep Analysis",
    description: "Choose your analytical focus from our classical and modern frameworks.",
    icon: <Search className="w-6 h-6 text-[#C4A574]" />,
    color: "from-[#C4A574]/20 to-[#8B6914]/10",
    border: "border-[#C4A574]/30",
    shadow: "shadow-[0_0_30px_rgba(196,165,116,0.15)]",
    delay: 0.2,
  },
  {
    number: "3",
    title: "Reflect Conversationally",
    description: "Engage in dialogue to understand deeper meanings and connections.",
    icon: <MessageSquare className="w-6 h-6 text-amber-400" />,
    color: "from-amber-500/20 to-amber-900/10",
    border: "border-amber-500/30",
    shadow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    delay: 0.3,
  },
  {
    number: "4",
    title: "Synthesize & Learn",
    description: "Gather insights across lexicons, tafsirs, and translations seamlessly.",
    icon: <LineChart className="w-6 h-6 text-[#C4A574]" />,
    color: "from-[#C4A574]/20 to-[#8B6914]/10",
    border: "border-[#C4A574]/30",
    shadow: "shadow-[0_0_30px_rgba(196,165,116,0.15)]",
    delay: 0.4,
  },
];

export default function AboutAppSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const y4 = useTransform(scrollYProgress, [0, 1], [200, -200]);

  const transforms = [y1, y2, y3, y4];

  return (
    <section ref={containerRef} className="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center py-32 overflow-hidden border-t border-white/5">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C4A574]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col items-center">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C4A574]/10 border border-[#C4A574]/20 text-[#C4A574] text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>How it Works</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            How to Study with <span className="text-[#C4A574]">Al-Juthur</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-400 font-light">
            A simple, guided process to unlock deeper understanding of the Qur'an through AI-powered reflection and classical sources.
          </p>
        </motion.div>

        {/* Floating Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              style={{ y: transforms[idx] }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: step.delay }}
              className={`relative flex flex-col p-8 rounded-3xl bg-gradient-to-b ${step.color} border ${step.border} ${step.shadow} backdrop-blur-xl group hover:-translate-y-2 transition-transform duration-500`}
            >
              {/* Top Row: Icon and Number */}
              <div className="flex justify-between items-start mb-12">
                <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  {step.icon}
                </div>
                <span className="text-5xl font-black text-white/5 group-hover:text-white/10 transition-colors duration-500">
                  {step.number}
                </span>
              </div>
              
              {/* Bottom Row: Text */}
              <div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  {step.description}
                </p>
              </div>

              {/* Hover Glow Effect inside card */}
              <div className={`absolute inset-0 bg-gradient-to-t ${step.color} opacity-0 group-hover:opacity-50 transition-opacity duration-500 rounded-3xl pointer-events-none`} />
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-32 text-center"
        >
          <p className="text-xl font-bold text-[#C4A574]">
            Scholarly-backed insights. Interactive dialogue. Your reflection journey.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
