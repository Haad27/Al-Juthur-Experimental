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
    <img
      src="/assets/logo/al_juthur_new_logo.png"
      alt="Al-Juthur Logo"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-contain", className)}
      {...(props as any)}
    />
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
