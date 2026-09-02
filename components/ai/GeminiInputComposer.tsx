"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArrowUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface GeminiInputComposerProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  activeModeId: string;
  onSwitchMode: (modeId: string) => void;
  currentBot: RagModeInfo;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

export default function GeminiInputComposer({
  input,
  setInput,
  onSend,
  isLoading,
  activeModeId,
  onSwitchMode,
  currentBot,
  autoFocus = false,
  placeholder,
  className,
}: GeminiInputComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  // Auto-resize textarea and detect multiline state
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate natural scrollHeight
    textarea.style.height = "auto";

    if (!input) {
      if (isMultiline) setIsMultiline(false);
      textarea.style.height = "26px";
      return;
    }

    const scrollHeight = textarea.scrollHeight;
    const hasNewline = input.includes("\n");
    const multi = hasNewline || scrollHeight > 38;

    if (multi !== isMultiline) {
      setIsMultiline(multi);
    }

    if (multi) {
      textarea.style.height = `${Math.min(scrollHeight, 220)}px`;
    } else {
      textarea.style.height = "26px";
    }
  }, [input, isMultiline]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const textarea = textareaRef.current;
      if (!textarea || !input) return;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const multi = input.includes("\n") || scrollHeight > 38;
      setIsMultiline(multi);
      textarea.style.height = multi ? `${Math.min(scrollHeight, 220)}px` : "26px";
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSend();
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex w-full bg-zinc-900/95 border border-zinc-800/90 hover:border-zinc-700/80 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-emerald-500/30 shadow-2xl transition-all duration-150 ease-out",
        isMultiline
          ? "flex-col rounded-3xl p-3 sm:p-4 gap-2"
          : "flex-row items-center rounded-full px-4 py-2 sm:py-2.5 gap-2",
        className
      )}
    >
      {/* Auto-growing Textarea Input */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || `Ask ${currentBot.shortName}...`}
        rows={1}
        autoFocus={autoFocus}
        className={cn(
          "bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder-zinc-500 text-sm sm:text-base text-zinc-100 resize-none leading-relaxed custom-scrollbar",
          isMultiline
            ? "w-full min-h-[56px] max-h-[220px] py-1 px-1"
            : "flex-1 min-h-[26px] max-h-[220px] py-1 px-0"
        )}
      />

      {/* Right side controls (aligned in-row when single-line, bottom-right when multi-line) */}
      <div
        className={cn(
          "flex items-center shrink-0",
          isMultiline ? "justify-end gap-2 pt-1.5 w-full" : "gap-1.5 ml-1"
        )}
      >
        {/* Mode Dropdown (Flash-style from Gemini) */}
        <Select value={activeModeId} onValueChange={onSwitchMode}>
          <SelectTrigger className="w-auto h-8 px-2.5 sm:px-3 bg-transparent hover:bg-zinc-800/70 border-0 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm rounded-full focus:ring-0 focus:ring-offset-0 gap-1 shadow-none inline-flex items-center cursor-pointer transition-colors shrink-0">
            <span className="truncate max-w-[120px] sm:max-w-[170px]">{currentBot.shortName}</span>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800 text-zinc-300 max-h-[380px] w-[300px] sm:w-[360px]">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 mb-1 flex items-center justify-between">
              <span>Select AI Scholar Persona</span>
              <span className="text-emerald-400">6 Bots Available</span>
            </div>
            {RAG_MODES.map((bot) => (
              <SelectItem
                key={bot.id}
                value={bot.id}
                className="focus:bg-zinc-800/80 focus:text-white cursor-pointer py-2.5 border-b border-zinc-800/30 last:border-none"
              >
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Bot className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{bot.shortName}</span>
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${bot.badgeColor}`}>
                      {bot.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                    {bot.targetIntent}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Circular Send Button with Up Arrow (Gemini Pic 3 style) */}
        <button
          type="button"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            "size-8 sm:size-8.5 rounded-full flex items-center justify-center transition-all shrink-0",
            input.trim() && !isLoading
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm shadow-emerald-500/20 cursor-pointer active:scale-95"
              : "bg-zinc-800/80 text-zinc-600 cursor-not-allowed"
          )}
          title="Send Question"
        >
          <ArrowUp className="size-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
