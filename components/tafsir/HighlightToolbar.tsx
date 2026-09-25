"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Edit3, Trash2, Check, Highlighter, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

export type BaseColor = "gold" | "pink" | "green" | "blue" | "purple";
export type HighlightColor = 
  | BaseColor 
  | "gold_underline" 
  | "pink_underline" 
  | "green_underline" 
  | "blue_underline" 
  | "purple_underline";

export interface HighlightSelection {
  id?: string;
  text: string;
  surahNumber: number;
  ayahNumber: number;
  type: "arabic" | "translation";
  x: number;
  y: number;
  isExisting?: boolean;
  color?: HighlightColor;
}

interface HighlightToolbarProps {
  selection: HighlightSelection | null;
  onHighlight: (color: HighlightColor) => Promise<void>;
  onDelete: () => Promise<void>;
  onNote: () => void;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}

// Readest soft pastel reader palette (comfortable on dark/light backgrounds)
const COLOR_PALETTE: { base: BaseColor; bg: string; border: string; label: string }[] = [
  { base: "gold",   bg: "#facc15", border: "#eab308", label: "Amber Gold"   },
  { base: "pink",   bg: "#f87171", border: "#ef4444", label: "Rose Coral"   },
  { base: "green",  bg: "#4ade80", border: "#22c55e", label: "Sage Green"   },
  { base: "blue",   bg: "#60a5fa", border: "#3b82f6", label: "Sky Blue"     },
  { base: "purple", bg: "#a78bfa", border: "#8b5cf6", label: "Soft Violet"  },
];

export default function HighlightToolbar({
  selection,
  onHighlight,
  onDelete,
  onNote,
  onCopy,
  onShare,
  onClose,
}: HighlightToolbarProps) {
  const [mounted, setMounted] = useState(false);
  const [savingColor, setSavingColor] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<"highlight" | "underline">("highlight");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Detect style if existing selection has underline suffix
  useEffect(() => {
    if (selection?.color) {
      if (selection.color.endsWith("_underline")) {
        setActiveStyle("underline");
      } else {
        setActiveStyle("highlight");
      }
    }
  }, [selection]);

  // Adjust position so the toolbar stays within viewport bounds
  const getPosition = () => {
    if (!selection) return { top: 0, left: 0 };
    const GAP = 12;
    const TOOLBAR_H = 48;
    const TOOLBAR_W = 340; // approx

    let top = selection.y - TOOLBAR_H - GAP;
    let left = selection.x - TOOLBAR_W / 2;

    if (typeof window !== "undefined") {
      left = Math.max(8, Math.min(left, window.innerWidth - TOOLBAR_W - 8));
      if (top < 8) {
        top = selection.y + GAP + 16; // Flip below
      }
    }
    return { top, left };
  };

  if (!mounted || !selection) return null;

  const { top, left } = getPosition();

  // Clicking a color toggles it: if already active, it REMOVES the highlight (disappears)
  const handleColorClick = async (baseColor: BaseColor) => {
    const fullColor: HighlightColor = activeStyle === "underline" 
      ? (`${baseColor}_underline` as HighlightColor) 
      : baseColor;

    if (selection.isExisting && selection.color === fullColor) {
      // Toggle off / disappear
      setSavingColor(fullColor);
      await onDelete();
      setSavingColor(null);
    } else {
      // Apply new color / style
      setSavingColor(fullColor);
      await onHighlight(fullColor);
      setSavingColor(null);
    }
  };

  const toolbar = (
    <div
      ref={toolbarRef}
      className="fixed z-[9999] highlight-popover"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()} // prevent losing selection
    >
      {/* Main pill toolbar */}
      <div className="flex items-center bg-card/95 backdrop-blur-md border border-border rounded-full shadow-2xl overflow-hidden px-1.5 py-1 gap-1 animate-in fade-in zoom-in-95 duration-150">

        {/* Action buttons */}
        <ToolbarBtn onClick={onCopy} title="Copy Selected Text">
          <Copy className="size-3.5" />
          <span className="text-xs font-medium">Copy</span>
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={onNote} title="Add Reflection / Note">
          <Edit3 className="size-3.5" />
          <span className="text-xs font-medium">Note</span>
        </ToolbarBtn>

        <Divider />

        {/* Style Selector: Fill vs Underline */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-full">
          <button
            onClick={() => setActiveStyle("highlight")}
            title="Highlight fill mode"
            className={cn(
              "p-1 rounded-full transition-all text-xs cursor-pointer",
              activeStyle === "highlight" 
                ? "bg-card text-foreground shadow-xs" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Highlighter className="size-3.5" />
          </button>
          <button
            onClick={() => setActiveStyle("underline")}
            title="Underline mode"
            className={cn(
              "p-1 rounded-full transition-all text-xs cursor-pointer",
              activeStyle === "underline" 
                ? "bg-card text-foreground shadow-xs" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Underline className="size-3.5" />
          </button>
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 px-1">
          {COLOR_PALETTE.map((c) => {
            const targetColorKey: HighlightColor = activeStyle === "underline" 
              ? (`${c.base}_underline` as HighlightColor) 
              : c.base;
            const isSelected = selection.color === targetColorKey;

            return (
              <button
                key={c.base}
                title={`${c.label} (${activeStyle}) — Click again to remove`}
                onClick={() => handleColorClick(c.base)}
                className={cn(
                  "relative size-5.5 rounded-full hover:scale-115 transition-all flex items-center justify-center cursor-pointer shadow-xs",
                  activeStyle === "underline" ? "border-2" : ""
                )}
                style={{
                  backgroundColor: activeStyle === "underline" ? "transparent" : c.bg,
                  borderColor: c.border,
                }}
              >
                {savingColor === targetColorKey && (
                  <Check className="size-3 text-white dark:text-black" strokeWidth={3} />
                )}
                {!savingColor && isSelected && (
                  <Check className={cn("size-3", activeStyle === "underline" ? "text-foreground" : "text-black")} strokeWidth={3} />
                )}
                {/* Active selection halo */}
                {isSelected && (
                  <div className="absolute -inset-0.5 rounded-full ring-2 ring-foreground/40 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* Always-accessible Remove / Clear Highlight Button */}
        <Divider />
        <ToolbarBtn
          onClick={onDelete}
          title="Remove / Clear Highlight"
          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="size-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Dismiss / Close */}
        <ToolbarBtn onClick={onClose} title="Dismiss">
          <X className="size-3.5" />
        </ToolbarBtn>
      </div>

      {/* Small arrow pointing down */}
      <div className="flex justify-center">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid var(--border)",
          }}
        />
      </div>
    </div>
  );

  return createPortal(toolbar, document.body);
}

function ToolbarBtn({
  onClick,
  title,
  children,
  className,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-foreground hover:bg-muted transition-colors text-xs font-medium cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border/60 shrink-0" />;
}
