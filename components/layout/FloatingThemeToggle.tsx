"use client";

import ThemeToggleButton from "@/components/ThemeToggleButton";

/** Fixed theme control — same corner on every route, including the 3D landing. */
export default function FloatingThemeToggle() {
  return (
    <div className="fixed top-3.5 right-3.5 z-[80]">
      <ThemeToggleButton />
    </div>
  );
}
