"use client";

import { useRouter } from "next/navigation";
import { RAG_MODES } from "@/lib/ai/rag/modes-config";
import { cn } from "@/lib/utils";
import { BookOpen, Layers } from "lucide-react";

export default function RagModeChips({
  activeModeId,
  onSwitchMode,
}: {
  activeModeId: string;
  onSwitchMode?: (modeId: string) => void;
}) {
  const router = useRouter();

  const switchMode = (id: string) => {
    if (onSwitchMode) onSwitchMode(id);
    else router.push(`/rag?mode=${id}`);
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2">
      {RAG_MODES.map((mode) => {
        const active = mode.id === activeModeId;
        const Icon = mode.id === "lexicon" ? Layers : BookOpen;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => switchMode(mode.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs",
              active
                ? "border-accent/40 bg-accent/15 text-accent font-semibold"
                : "border-border bg-card text-muted-foreground hover:border-accent/30 hover:text-foreground"
            )}
            title={mode.targetIntent}
          >
            <Icon className="size-3.5 text-accent shrink-0" />
            <span>{mode.shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
