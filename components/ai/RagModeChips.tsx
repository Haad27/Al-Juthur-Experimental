"use client";

import { useRouter } from "next/navigation";
import { RAG_MODES } from "@/lib/ai/rag/modes-config";
import { cn } from "@/lib/utils";

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
    <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
      {RAG_MODES.map((mode) => {
        const active = mode.id === activeModeId;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => switchMode(mode.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "border-accent/50 bg-accent/15 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-accent/30 hover:text-foreground"
            )}
            title={mode.targetIntent}
          >
            {mode.shortName}
          </button>
        );
      })}
    </div>
  );
}
