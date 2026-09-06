import React, { useState } from "react";
import { X, Save, Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveUserNote } from "@/lib/readerStorage";

interface AyahNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  ayahNumber: number;
}

export default function AyahNoteModal({ isOpen, onClose, surahNumber, ayahNumber }: AyahNoteModalProps) {
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveUserNote(surahNumber, ayahNumber, noteText);
      if (saved) {
        toast.success("Note saved to your library.");
        setNoteText("");
        onClose();
      } else {
        toast.error("Failed to save note.");
      }
    } catch (e) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Edit3 className="size-5 text-accent" />
            <h3 className="font-bold text-foreground text-lg tracking-tight">Add Note</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <div className="p-5 flex-1">
          <div className="mb-3 text-xs font-semibold text-accent uppercase tracking-wider">
            Surah {surahNumber}, Verse {ayahNumber}
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your personal reflections or notes for this verse..."
            className="w-full h-32 sm:h-40 p-4 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-accent/50 resize-none transition"
          />
        </div>

        <div className="p-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-bold shadow-md shadow-accent/20 transition disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>Save Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}
