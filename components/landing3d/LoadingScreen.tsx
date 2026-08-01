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
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
        >
          <div className="w-64 flex flex-col items-center gap-6">
            {/* Logo and Spinner */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <motion.img
                src="/assets/favicon/apple-touch-icon.png"
                alt="Al Juthur Logo"
                className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/50 border-r-2 border-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-2 rounded-full border-b-2 border-emerald-400/30 border-l-2 border-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
            </div>
            
            {/* Progress Text */}
            <div className="flex flex-col items-center gap-2 w-full mt-4">
              <div className="text-center text-[10px] font-bold text-emerald-500/80 uppercase tracking-[0.2em] mb-1">
                Initializing Al Juthur
              </div>
              <div className="text-center text-[12px] font-medium text-zinc-400 tracking-wide mb-2">
                An engaging Quran experience
              </div>
              
              <div className="flex items-center justify-between w-full text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em]">
                <span>Loading Assets</span>
                <span>{Math.round(progress)}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
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
