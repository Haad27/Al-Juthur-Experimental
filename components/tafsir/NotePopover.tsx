"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Edit3, Quote, StickyNote } from "lucide-react";
import { UserNote } from "@/lib/readerStorage";

interface NotePopoverProps {
  note: UserNote | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (note: UserNote) => void;
}

export default function NotePopover({
  note,
  position,
  onClose,
  onDelete,
  onEdit,
}: NotePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!note || !position) return null;

  // Extract anchor quote if formatted as [Re: "quote"]\n\nbody
  const anchorMatch = note.text.match(/^\[Re:\s*"([^"]+)"\]\n\n([\s\S]*)$/);
  const anchorText = anchorMatch ? anchorMatch[1] : null;
  const noteBody = anchorMatch ? anchorMatch[2] : note.text;

  // Viewport-safe coordinates
  const CARD_WIDTH = 300;
  const CARD_HEIGHT = 180;
  const GAP = 10;

  let top = position.y - CARD_HEIGHT - GAP;
  let left = position.x - CARD_WIDTH / 2;

  if (typeof window !== "undefined") {
    left = Math.max(12, Math.min(left, window.innerWidth - CARD_WIDTH - 12));
    if (top < 12) {
      top = position.y + GAP + 20; // Flip below
    }
  }

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] animate-in fade-in zoom-in-95 duration-150"
      style={{ top, left, width: CARD_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden p-3.5 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
            <StickyNote className="size-3.5" />
            <span>Note · Verse {note.ayahNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Anchored Quote Preview */}
        {anchorText && (
          <div className="flex items-start gap-1.5 p-2 rounded-xl bg-accent/5 border border-accent/15 text-[11px] text-muted-foreground italic leading-relaxed">
            <Quote className="size-3 text-accent shrink-0 mt-0.5" />
            <span className="line-clamp-2">"{anchorText}"</span>
          </div>
        )}

        {/* Note Body */}
        <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium max-h-48 overflow-y-auto pr-1">
          {noteBody}
        </div>

        {/* Bottom Actions & Timestamp */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(note)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Edit Note"
            >
              <Edit3 className="size-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete Note"
            >
              <Trash2 className="size-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(popoverContent, document.body);
}
