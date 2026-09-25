import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

const NavigatorButton = ({
  direction,
  surahNumber,
}: {
  direction: "Previous" | "Next";
  surahNumber: number;
}) => (
  <Link
    href={`/surah/${surahNumber}`}
    prefetch={true}
    className={`
      flex items-center gap-2 px-5 py-2.5 transition-all duration-200
      shadow-sm rounded-xl text-xs sm:text-sm font-semibold
      bg-card border border-border
      hover:bg-muted hover:border-accent/40 hover:shadow-md
      ${direction === "Previous" ? "justify-start" : "justify-end"}
    `}
  >
    {direction === "Previous" && (
      <ArrowLeftIcon className="w-4 h-4 text-accent shrink-0" />
    )}
    <span className="text-foreground">{direction} Surah</span>
    {direction === "Next" && (
      <ArrowRightIcon className="w-4 h-4 text-accent shrink-0" />
    )}
  </Link>
);

export default NavigatorButton;
