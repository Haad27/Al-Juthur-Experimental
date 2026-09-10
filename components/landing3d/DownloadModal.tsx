"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Download,
  Laptop,
  Monitor,
  Apple,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HardDriveDownload,
} from "lucide-react";

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GITHUB_REPO = "Haad27/Al-Juthur";
const LATEST_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

export default function DownloadModal({ open, onOpenChange }: DownloadModalProps) {
  const [detectedOs, setDetectedOs] = useState<"windows" | "mac" | "linux" | "other">("windows");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes("win")) {
      setDetectedOs("windows");
    } else if (ua.includes("mac")) {
      setDetectedOs("mac");
    } else if (ua.includes("linux")) {
      setDetectedOs("linux");
    } else {
      setDetectedOs("other");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#18181b] border-[#3f3f46] text-zinc-100 p-6 md:p-8 rounded-2xl shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C4A574]/10 border border-[#C4A574]/30 text-[#C4A574] text-xs font-semibold uppercase tracking-wider w-fit">
            <HardDriveDownload className="w-3.5 h-3.5" />
            Standalone Desktop App
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Download Al-Juthur
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400 leading-relaxed">
            Distraction-free Quranic study platform on your local machine with 120+ Tafsirs, 13 Classical Lexicons, and local database capability.
          </DialogDescription>
        </DialogHeader>

        {/* Operating Systems grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {/* Windows */}
          <a
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 ${
              detectedOs === "windows"
                ? "bg-[#C4A574]/10 border-[#C4A574]/50 hover:border-[#C4A574] hover:shadow-[0_0_20px_rgba(196,165,116,0.25)]"
                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.08]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-5 h-5 text-[#C4A574]" />
                  <span className="font-semibold text-white">Windows</span>
                </div>
                {detectedOs === "windows" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C4A574]/20 text-[#C4A574] border border-[#C4A574]/40">
                    Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Windows 10, 11 (64-bit)</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-medium text-[#C4A574] group-hover:translate-x-0.5 transition-transform">
              <span>Installer (.exe)</span>
              <Download className="w-4 h-4" />
            </div>
          </a>

          {/* macOS */}
          <a
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 ${
              detectedOs === "mac"
                ? "bg-[#C4A574]/10 border-[#C4A574]/50 hover:border-[#C4A574] hover:shadow-[0_0_20px_rgba(196,165,116,0.25)]"
                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.08]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-5 h-5 text-[#C4A574]" />
                  <span className="font-semibold text-white">macOS</span>
                </div>
                {detectedOs === "mac" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C4A574]/20 text-[#C4A574] border border-[#C4A574]/40">
                    Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Apple Silicon & Intel Mac</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-medium text-[#C4A574] group-hover:translate-x-0.5 transition-transform">
              <span>Disk Image (.dmg)</span>
              <Download className="w-4 h-4" />
            </div>
          </a>
        </div>

        {/* Feature bullets */}
        <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C4A574] shrink-0" />
            <span>Built-in local SQLite & full offline Quran study support</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C4A574] shrink-0" />
            <span>Open-source, verified builds published directly on GitHub</span>
          </div>
        </div>

        {/* Footer / All releases link */}
        <div className="mt-2 flex items-center justify-between pt-3 border-t border-white/10 text-xs">
          <span className="text-zinc-500">Latest Desktop Release</span>
          <a
            href={LATEST_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#C4A574] transition-colors font-medium"
          >
            <span>All GitHub Releases</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
