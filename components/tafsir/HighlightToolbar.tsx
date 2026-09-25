"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Share2, Edit3, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type HighlightColor = "gold" | "green" | "blue" | "pink" | "purple";

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

const COLORS: { value: HighlightColor; bg: string; label: string }[] = [
  { value: "gold",   bg: "#d97706", label: "Amber"  },
  { value: "pink",   bg: "#db2777", label: "Pink"   },
  { value: "green",  bg: "#16a34a", label: "Green"  },
  { value: "blue",   bg: "#2563eb", label: "Blue"   },
  { value: "purple", bg: "#9333ea", label: "Purple" },
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
  const [savingColor, setSavingColor] = useState<HighlightColor | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Adjust position so the toolbar stays within viewport bounds
  const getPosition = () => {
    if (!selection) return { top: 0, left: 0 };
    const GAP = 12;
    const TOOLBAR_H = 48;
    const TOOLBAR_W = 320; // approx

    let top = selection.y - TOOLBAR_H - GAP;
    let left = selection.x - TOOLBAR_W / 2;

    // Clamp within viewport
    if (typeof window !== "undefined") {
      left = Math.max(8, Math.min(left, window.innerWidth - TOOLBAR_W - 8));
      if (top < 8) {
        // flip below selection
        top = selection.y + GAP + 8;
      }
    }
    return { top, left };
  };

  if (!mounted || !selection) return null;

  const { top, left } = getPosition();

  const handleColor = async (color: HighlightColor) => {
    setSavingColor(color);
    await onHighlight(color);
    setSavingColor(null);
  };

  const toolbar = (
    <div
      ref={toolbarRef}
      className="fixed z-[9999] highlight-popover"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()} // prevent losing selection
    >
      {/* Main pill toolbar */}
      <div className="flex items-center bg-card border border-border rounded-full shadow-2xl overflow-hidden px-1 py-1 gap-0.5 animate-in fade-in zoom-in-95 duration-150">

        {/* Action buttons */}
        <ToolbarBtn onClick={onCopy} title="Copy">
          <Copy className="size-3.5" />
          <span className="text-xs font-medium">Copy</span>
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={onNote} title="Add Note">
          <Edit3 className="size-3.5" />
          <span className="text-xs font-medium">Note</span>
        </ToolbarBtn>

        <Divider />

        {/* Color swatches */}
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((c) => (
            <button
              key={c.value}
              title={`Highlight ${c.label}`}
              onClick={() => handleColor(c.value)}
              className="relative size-5 rounded-full hover:scale-125 transition-transform shadow-sm border border-black/10 flex items-center justify-center"
              style={{ backgroundColor: c.bg }}
            >
              {savingColor === c.value && (
                <Check className="size-3 text-white" strokeWidth={3} />
              )}
              {/* Show ring if this color matches existing highlight */}
              {!savingColor && selection.isExisting && selection.color === c.value && (
                <div className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-1" style={{ outlineOffset: '1px' }} />
              )}
            </button>
          ))}
        </div>

        {/* Delete (only for existing highlights) */}
        {selection.isExisting && (
          <>
            <Divider />
            <ToolbarBtn
              onClick={onDelete}
              title="Remove Highlight"
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="size-3.5" />
            </ToolbarBtn>
          </>
        )}

        <Divider />

        {/* Close */}
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
        "flex items-center gap-1 px-2 py-1 rounded-full text-foreground hover:bg-muted transition-colors text-xs font-medium",
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border shrink-0" />;
}
