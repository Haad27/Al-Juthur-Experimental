"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const { progress, active, loaded, total } = useProgress();
  const [isVisible, setIsVisible] = useState(true);

  // We want to keep the loading screen until everything is fully loaded.
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (progress === 100 || (loaded === total && total > 0)) {
      // Add a small delay for smoother transition
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
    } else {
      // Fallback: if loading takes too long or gets stuck, hide after 4 seconds
      // to ensure the user doesn't get permanently blocked
      timer = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
    }
    
    return () => clearTimeout(timer);
  }, [progress, loaded, total]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141312] text-[#EDE8E0]"
        >
          {/* Subtle ambient warm aura */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-[#C4A574]/5 blur-[120px] rounded-full" />
          </div>

          <div className="w-64 flex flex-col items-center gap-4 relative z-10 text-center px-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-[0.25em] uppercase text-[#F5E8C7]">
              Al-Juthur
            </h1>
            <p className="text-xs text-[#A8895A] tracking-wider uppercase font-medium">
              Digital Quranic Workspace
            </p>

            {/* Clean Gold Progress Bar */}
            <div className="w-full flex flex-col gap-2 mt-4">
              <div className="flex items-center justify-between w-full text-[10px] font-mono tracking-wider text-[#A8895A]">
                <span>LOADING 3D ASSETS</span>
                <span className="font-bold text-[#F5E8C7]">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-[2px] bg-[#2A2520] rounded-full relative overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#8B6914] via-[#C4A574] to-[#F5E8C7] rounded-full shadow-[0_0_8px_rgba(196,165,116,0.6)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
