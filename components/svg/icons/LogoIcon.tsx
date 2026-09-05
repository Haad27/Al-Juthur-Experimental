"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * Concept 1: The Open Mus'haf & Golden Roots (المصحف والجذور)
 * Designed for Al-Juthur: Adapts automatically to light/sepia and dark themes.
 */
export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 32,
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-colors duration-200", className)}
      aria-label="Al-Juthur Logo"
      {...props}
    >
      <defs>
        <linearGradient
          id="aljuthur-book-grad"
          x1="15"
          y1="15"
          x2="85"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--accent, #8B6914)" />
          <stop offset="50%" stopColor="var(--primary, #6B5344)" />
          <stop offset="100%" stopColor="var(--accent, #8B6914)" />
        </linearGradient>

        <linearGradient
          id="aljuthur-roots-grad"
          x1="50"
          y1="50"
          x2="50"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--primary, #6B5344)" />
          <stop offset="40%" stopColor="var(--accent, #8B6914)" />
          <stop offset="100%" stopColor="var(--accent, #8B6914)" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Book Outer Hardcover Spine & Base Outline */}
      <path
        d="M 16 26 L 16 52 C 26 55 38 58 50 64 C 62 58 74 55 84 52 L 84 26 L 81 26 L 81 50 C 71 53 60 56 50 61 C 40 56 29 53 19 50 L 19 26 Z"
        fill="currentColor"
        opacity="0.9"
      />

      {/* Outer Thick Page Leaves */}
      <path
        d="M 20 22 C 30 25 41 28 49 32 L 49 57 C 40 53 30 50 20 47 Z"
        fill="url(#aljuthur-book-grad)"
      />
      <path
        d="M 80 22 C 70 25 59 28 51 32 L 51 57 C 60 53 70 50 80 47 Z"
        fill="url(#aljuthur-book-grad)"
      />

      {/* Inner Raised Mus'haf Pages */}
      <path
        d="M 24 17 C 33 20 42 23 49 26 L 49 51 C 42 48 33 45 24 42 Z"
        fill="var(--card, #EFE6D0)"
        stroke="var(--accent, #8B6914)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M 76 17 C 67 20 58 23 51 26 L 51 51 C 58 48 67 45 76 42 Z"
        fill="var(--card, #EFE6D0)"
        stroke="var(--accent, #8B6914)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Inner Script Guideline Accents (Calligraphic hint) */}
      <path
        d="M 28 27 Q 37 30 44 32.5 M 28 33 Q 37 36 44 38.5 M 28 39 Q 37 42 44 44.5"
        stroke="var(--accent, #8B6914)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 72 27 Q 63 30 56 32.5 M 72 33 Q 63 36 56 38.5 M 72 39 Q 63 42 56 44.5"
        stroke="var(--accent, #8B6914)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Spine Central Seam */}
      <line
        x1="50"
        y1="25"
        x2="50"
        y2="63"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ================= Organic Roots Network ================= */}
      {/* Central Anchor Taproot */}
      <path
        d="M 48.5 61 C 48.5 68 47.2 76 47.8 83 C 48.3 88 49.6 92 50 95 C 50.4 92 51.7 88 52.2 83 C 52.8 76 51.5 68 51.5 61 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Left Primary Root Tendril */}
      <path
        d="M 47 64 C 42 69 33 73 26 79 C 22 83 19.5 88 18.5 91 C 20.5 90 23.5 86 26.5 83 C 32.5 78 40 75 46 71 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Left Upper Sweeping Root Tendril */}
      <path
        d="M 42 62 C 34 65 24 67 17 72 C 13 75 11 78.5 10 82 C 12 81 15.5 77.5 20.5 75 C 28 72 36 69 41 65 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Left Secondary Offshoot */}
      <path
        d="M 47 74 C 42 79 36 85 30 90.5 C 32 89.5 36.5 85.5 41.5 80.5 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Right Primary Root Tendril */}
      <path
        d="M 53 64 C 58 69 67 73 74 79 C 78 83 80.5 88 81.5 91 C 79.5 90 76.5 86 73.5 83 C 67.5 78 60 75 54 71 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Right Upper Sweeping Root Tendril */}
      <path
        d="M 58 62 C 66 65 76 67 83 72 C 87 75 89 78.5 90 82 C 88 81 84.5 77.5 79.5 75 C 72 72 64 69 59 65 Z"
        fill="url(#aljuthur-roots-grad)"
      />

      {/* Right Secondary Offshoot */}
      <path
        d="M 53 74 C 58 79 64 85 70 90.5 C 68 89.5 63.5 85.5 58.5 80.5 Z"
        fill="url(#aljuthur-roots-grad)"
      />
    </svg>
  );
};

export interface LogoLockupProps {
  className?: string;
  iconSize?: number | string;
}

/**
 * Clean Brand Lockup:
 * Concept 1 Logo + "Al-Juthur"
 */
export const LogoLockup: React.FC<LogoLockupProps> = ({
  className,
  iconSize = 28,
}) => {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <LogoIcon size={iconSize} className="text-accent shrink-0" />
      <span className="font-bold tracking-tight text-foreground text-base sm:text-lg">
        Al-Juthur
      </span>
    </div>
  );
};

export default LogoIcon;
