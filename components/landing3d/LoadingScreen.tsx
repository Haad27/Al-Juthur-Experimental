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
          {/* Ambient Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-900/20 blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-teal-900/20 blur-[140px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 bg-emerald-500/10 blur-[100px] rounded-full" />
          </div>

          <div className="w-64 flex flex-col items-center gap-6 relative z-10">
            {/* Logo and Rings */}
            <div className="relative flex items-center justify-center w-24 h-24">
              {/* Ripple Rings with Emerald Accent */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/35 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-0 rounded-full border border-teal-500/25 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }} />
              <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '2s' }} />

              <motion.img
                src="/assets/favicon/apple-touch-icon.png"
                alt="Al Juthur Logo"
                className="w-16 h-16 object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.55)]"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="flex flex-col items-center gap-2 w-full mt-4">
              <div className="text-center text-[11px] font-bold text-emerald-400 uppercase tracking-[0.25em] mb-0.5">
                Initializing Al Juthur
              </div>
              <div className="text-center text-[12px] font-medium text-emerald-100/75 tracking-wide mb-2">
                An engaging Quran experience
              </div>
              
              <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em]">
                <span className="text-emerald-400/80">Loading Assets</span>
                <span className="text-emerald-300 font-mono">{Math.round(progress)}%</span>
              </div>
              
              {/* Luminous Emerald Progress Bar */}
              <div className="w-full h-[3px] bg-emerald-950/80 border border-emerald-500/20 rounded-full overflow-hidden relative shadow-inner">
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.85)] rounded-full"
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
