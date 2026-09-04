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
      flex items-center gap-2 px-5 py-2 transition
      shadow-md rounded-md text-sm
      bg-card dark:bg-muted border border-border dark:border-border
      hover:bg-muted dark:hover:bg-muted
      ${direction === "Previous" ? "justify-start" : "justify-end"}
    `}
  >
    {direction === "Previous" && (
      <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
    )}
    <span className="text-foreground">{direction} Surah</span>
    {direction === "Next" && (
      <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
    )}
  </Link>
);

export default NavigatorButton;
