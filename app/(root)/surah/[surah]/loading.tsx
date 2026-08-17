import React from "react";
import AlJuthurLoadingProgress from "@/components/shared/AlJuthurLoadingProgress";

export default function SurahLoading() {
  return (
    <div className="min-h-screen bg-[var(--sephia-primary)] dark:bg-zinc-950 w-full flex flex-col items-center justify-center p-6 text-center">
      <AlJuthurLoadingProgress
        title="Loading Holy Quran"
        subtitle="Al-Juthur Islamic Knowledge Engine"
        statusMessages={[
          "Retrieving authentic classical Arabic text...",
          "Aligning morphology, root lexicons & translations...",
          "Preparing reader layout & audio recitations..."
        ]}
        minDurationMs={800}
      />
    </div>
  );
}

