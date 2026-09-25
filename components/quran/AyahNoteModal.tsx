"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Save, Edit3, Loader2, Quote } from "lucide-react";
import { toast } from "sonner";
import { saveUserNote } from "@/lib/readerStorage";

interface AyahNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
  /** Optional: pre-selected text to anchor the note to */
  selectedText?: string;
  /** Called after a note is successfully saved */
  onSave?: (note: any) => void;
}

export default function AyahNoteModal({
  isOpen,
  onClose,
  surahNumber,
  ayahNumber,
  selectedText,
  onSave,
}: AyahNoteModalProps) {
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Slight delay so the modal animation completes first
      const t = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Reset note text when closing
  useEffect(() => {
    if (!isOpen) setNoteText("");
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSave = async () => {
    if (!noteText.trim()) {
      toast.error("Please write a note before saving.");
      return;
    }
    setIsSaving(true);
    try {
      // Prefix note with anchor text if provided
      const fullNote = selectedText
        ? `[Re: "${selectedText.slice(0, 120)}${selectedText.length > 120 ? "…" : ""}"]\n\n${noteText}`
        : noteText;

      const saved = await saveUserNote(surahNumber, ayahNumber, fullNote);
      if (saved) {
        toast.success("Note saved to your library.");
        setNoteText("");
        onSave?.(saved);
        onClose();
      } else {
        toast.error("Failed to save note. Please try again.");
      }
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Edit3 className="size-4 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">Add Note</h3>
              <p className="text-[11px] text-muted-foreground">
                Surah {surahNumber} · Verse {ayahNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Selected text anchor (if any) */}
        {selectedText && (
          <div className="px-5 pt-4 pb-0">
            <div className="flex gap-2.5 p-3 rounded-xl bg-accent/5 border border-accent/20">
              <Quote className="size-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-3">
                "{selectedText}"
              </p>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your reflection, cross-reference, or personal note…"
            className="w-full h-32 sm:h-40 p-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none transition-all"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground text-right">
            ⌘↵ to save
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 sm:pb-4 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !noteText.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-bold shadow-md shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Note
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
