"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Sparkles,
  AlertCircle,
  Loader2,
  Bot,
  User,
  BookOpen,
  Layers,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Copy,
  Bookmark,
  Trash2,
  Compass,
  Lightbulb
} from "lucide-react";
import { inter, amiri } from "@/app/fonts";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useVisualViewportOffset } from "@/hooks/useVisualViewport";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import { copyToClipboard } from "@/lib/utils";
import { saveScholarAnswer } from "@/lib/readerStorage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SourceItem {
  id: string;
  book: string;
  authorName: string;
  surah?: number | null;
  ayah?: number | null;
  rootWord?: string | null;
  snippet: string;
  workType: "tafsir" | "lexicon" | "textbook";
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isScopeInvalid?: boolean;
  sources?: SourceItem[];
}

const renderInlineBadges = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = child.split(/(\[[^\]]+\])/g);
      return parts.map((part, i) => {
        if (
          part.startsWith("[") &&
          part.endsWith("]") &&
          part.length > 2 &&
          (
            part.includes("Tafsir") ||
            part.includes("Surah") ||
            part.includes("Adwa") ||
            part.includes("Kathir") ||
            part.includes("Tabari") ||
            part.includes("Qurtubi") ||
            part.includes("Wasit") ||
            part.includes("Root") ||
            part.includes("Lexicon") ||
            part.includes("Lisan") ||
            part.includes("Mufradat") ||
            part.includes("Maqayis") ||
            part.includes("Qamus") ||
            part.includes("Shihah") ||
            part.includes("Mu'jam") ||
            part.match(/\[\d+:\d+\]/)
          )
        ) {
          const badgeText = part.slice(1, -1);
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono not-italic align-middle opacity-90 hover:opacity-100 transition-opacity"
            >
              <BookOpen className="size-2.5 text-emerald-400 shrink-0 inline" />
              <span>{badgeText}</span>
            </span>
          );
        }
        return part;
      });
    }
    if (React.isValidElement(child) && (child as any).props?.children) {
      return React.cloneElement(child, {
        ...(child as any).props,
        children: renderInlineBadges((child as any).props.children)
      });
    }
    return child;
  });
};

function RagChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModeId = searchParams.get("mode") || "default";
  const initialQuery = searchParams.get("q") || "";

  const currentBot = RAG_MODES.find((m) => m.id === activeModeId) || RAG_MODES[0];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);
  const [showDisclaimers, setShowDisclaimers] = useState<boolean>(true);
  useVisualViewportOffset();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const hasUserInteracted = useRef(false);

  // Fetch token quota on mount
  useEffect(() => {
    fetch("/api/ai/rag")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.success) {
          setRemainingTokens(data.remaining);
          if (data.limit) setTokenLimit(data.limit);
        }
      })
      .catch(console.error);
  }, []);

  // Handle initial query param `q` auto-send
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && messages.length === 0 && !isLoading) {
      handleSendQuery(initialQuery.trim());
    }
  }, [initialQuery]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setIsScrolledUp(!isNearBottom);
    }
  };

  const scrollToBottom = (force = false) => {
    if (!isScrolledUp || force) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (hasUserInteracted.current) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Mode change handler
  const handleSwitchMode = (modeId: string) => {
    router.push(`/rag?mode=${modeId}`);
  };

  // Reset or clear conversation
  const handleClearChat = () => {
    setMessages([]);
    hasUserInteracted.current = false;
    setShowDisclaimers(true);
    toast.success("Chat history cleared");
  };

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: queryText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsScrolledUp(false);
    hasUserInteracted.current = true;

    try {
      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText, mode: activeModeId })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();

        if (!data.success && !data.isScopeInvalid) {
          throw new Error(data.error || "Failed to generate response.");
        }

        if (data.remaining !== undefined) {
          setRemainingTokens(data.remaining);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.text,
            isScopeInvalid: data.isScopeInvalid,
            sources: data.sources || []
          }
        ]);
        return;
      }

      // Handle Streaming SSE
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream available.");

      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantMessage: Message = { role: "assistant", content: "", sources: [] };

      setMessages((prev) => [...prev, assistantMessage]);

      let lastUpdateTime = Date.now();
      let streamBuffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.type === "metadata") {
                  assistantMessage.sources = data.sources || [];
                  if (data.remaining !== undefined) setRemainingTokens(data.remaining);
                } else if (data.text) {
                  assistantMessage.content += data.text;
                }
              } catch (e) {
                // Ignore chunk parse errors
              }
            }
          }

          const now = Date.now();
          if (now - lastUpdateTime > 50 || done) {
            lastUpdateTime = now;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { ...assistantMessage };
              return newMessages;
            });
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Connection interrupted");
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.trim().length > 0) {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              content: lastMsg.content + "\n\n*(Generation interrupted. You can ask to continue.)*"
            }
          ];
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error while querying classical texts. Please try again or switch AI Scholar bots."
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    handleSendQuery(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-zinc-950 text-white ${inter.className}`}>
      {/* Top Header */}
      <header className="shrink-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 px-2.5 sm:px-6 py-2.5 sm:py-3 shadow-lg">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Link
              href="/home"
              className="flex items-center justify-center size-8 sm:size-auto sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 text-xs font-medium transition-all text-zinc-300 hover:text-white shrink-0"
              title="Return to Home"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline sm:ml-1.5">Home</span>
            </Link>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="size-7 sm:size-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/30 flex items-center justify-center shadow-inner shrink-0">
                <Bot className="size-3.5 sm:size-5 text-emerald-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="font-bold text-xs sm:text-base text-white tracking-tight shrink-0">AI Scholar</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden md:inline">
                    Quranic RAG Engine
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-zinc-400 truncate max-w-[90px] xs:max-w-[140px] sm:max-w-[260px]">
                  {currentBot.shortName}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions & Quota */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Disclaimers Toggle Button */}
            <button
              onClick={() => setShowDisclaimers(!showDisclaimers)}
              className={`flex items-center justify-center size-8 sm:size-auto sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                showDisclaimers
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
              title="Toggle Usage & Disclaimers"
            >
              <Info className="size-3.5 text-emerald-400" />
              <span className="hidden md:inline md:ml-1.5">Notes & Disclaimers</span>
            </button>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center justify-center size-8 sm:size-auto sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-950/30 text-xs text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden lg:inline lg:ml-1.5">Clear</span>
              </button>
            )}

            {/* Token Quota Badge */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[10px] sm:text-[11px] text-zinc-400 font-medium shrink-0">
              <Sparkles className="size-3 sm:size-3.5 text-emerald-400 shrink-0" />
              {remainingTokens !== null ? (
                <span className="whitespace-nowrap">
                  <strong className="text-emerald-400">{(tokenLimit - remainingTokens).toLocaleString()}</strong>
                  <span className="text-zinc-500 hidden sm:inline">/{tokenLimit.toLocaleString()}</span>
                </span>
              ) : (
                <span>Active</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mode Warning Bar (if specific guardrail active) */}
      {currentBot.warning && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-6 py-2 text-xs text-amber-200">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span className="line-clamp-2 sm:line-clamp-none">
              <strong>Active Guardrail:</strong> {currentBot.warning}
            </span>
          </div>
        </div>
      )}

      {/* Main Scrollable Area */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 md:p-5 custom-scrollbar overscroll-contain"
      >
        <div className="max-w-[1050px] mx-auto space-y-4 pb-4">

          {/* Opening Screen: Unified Master Card Container */}
          {(messages.length === 0 || showDisclaimers) && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative overflow-hidden rounded-3xl bg-zinc-900/60 border border-zinc-800/90 shadow-2xl backdrop-blur-2xl p-4 sm:p-5 md:p-6 transition-all">
                
                {/* Ambient Subtle Glow */}
                <div className="absolute -top-24 -right-24 size-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* 1. Header Section: Bot Persona Hero */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b border-zinc-800/80">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-10 sm:size-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                      <Bot className="size-5 sm:size-6 text-emerald-400" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {currentBot.botTitle}
                        </h1>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentBot.badgeColor}`}>
                          {currentBot.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                        {currentBot.description}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 self-start shrink-0 px-2.5 py-1 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                    <Sparkles className="size-3 text-emerald-400" />
                    <span>{currentBot.id}</span>
                  </div>
                </div>

                {/* 2. Middle 3-Column Section: Sources, Disclaimers, Guidance */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 py-3.5 sm:py-4 border-b border-zinc-800/80">
                  
                  {/* Sub-Card 1: Primary Indexed Sources */}
                  <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3 sm:p-3.5 flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      <BookOpen className="size-3.5 text-emerald-400 shrink-0" />
                      <span>Indexed Sources ({currentBot.sources.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentBot.sources.map((src, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[10px] sm:text-[11px] text-zinc-300 font-medium hover:border-emerald-500/30 transition-colors"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Card 2: Scope & Disclaimers */}
                  <div className="rounded-2xl bg-amber-950/20 border border-amber-500/25 p-3 sm:p-3.5 flex flex-col justify-between gap-2 shadow-inner">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                        <ShieldAlert className="size-3.5 shrink-0" />
                        <span>Scope & Disclaimers</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        {currentBot.disclaimer}
                      </p>
                    </div>
                    <div className="pt-1.5 border-t border-amber-500/20 text-[10px] text-amber-300/80 flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>Consult qualified Ulama for binding rulings.</span>
                    </div>
                  </div>

                  {/* Sub-Card 3: Scholarly Guidance */}
                  <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3 sm:p-3.5 flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>Scholarly Guidance</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-zinc-300">
                      {currentBot.usageNotes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className="size-1 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* 3. Bottom Row: Suggested Quick Inquiries */}
                <div className="relative z-10 pt-3 sm:pt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Lightbulb className="size-3.5 shrink-0" />
                      <span>Suggested Quick-Start Inquiries</span>
                    </div>
                    <span className="text-zinc-500 font-normal lowercase text-[10px]">click to ask</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {currentBot.examplePrompts.map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(promptText)}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-emerald-950/30 border border-zinc-800/90 hover:border-emerald-500/50 text-left text-xs text-zinc-200 transition-all flex flex-col justify-between gap-1.5 group cursor-pointer shadow-sm"
                      >
                        <span className="line-clamp-2 leading-relaxed text-[11px] text-zinc-300 group-hover:text-emerald-200 transition-colors">
                          "{promptText}"
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-400/80 flex items-center gap-0.5 self-end">
                          <span>Ask</span>
                          <Send className="size-2 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Chat Messages Feed */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 size-9 sm:size-10 rounded-2xl flex items-center justify-center shadow-md ${
                  msg.role === "user"
                    ? "bg-zinc-800 border border-zinc-700"
                    : msg.isScopeInvalid
                    ? "bg-amber-500/20 border border-amber-500/40"
                    : "bg-emerald-500/20 border border-emerald-500/40"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-4 sm:size-5 text-zinc-300" />
                ) : msg.isScopeInvalid ? (
                  <ShieldAlert className="size-4 sm:size-5 text-amber-400" />
                ) : (
                  <Bot className="size-4 sm:size-5 text-emerald-400" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3.5 sm:px-6 sm:py-5 shadow-md relative group ${
                  msg.role === "user"
                    ? "bg-zinc-800/90 border border-zinc-700/70 rounded-tr-xs text-zinc-100"
                    : msg.isScopeInvalid
                    ? "bg-amber-950/30 border border-amber-500/40 rounded-tl-xs text-amber-100"
                    : "bg-zinc-900/90 border border-zinc-800 rounded-tl-xs text-zinc-100"
                }`}
              >
                {/* Assistant Copy & Bookmark */}
                {msg.role === "assistant" && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                    <button
                      onClick={() => {
                        const previousUserMsg = messages.slice(0, idx).reverse().find((m) => m.role === "user");
                        const questionText = previousUserMsg?.content || "AI Scholar Inquiry";
                        saveScholarAnswer({
                          id: `scholar_${Date.now()}_${idx}`,
                          question: questionText,
                          answer: msg.content,
                          modeName: currentBot.name,
                          sources: msg.sources?.map((s) => ({
                            book: s.book,
                            authorName: s.authorName,
                            snippet: s.snippet
                          })),
                          timestamp: Date.now()
                        });
                        toast.success("Saved AI Scholar answer to Profile!");
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="Save Answer to Profile"
                    >
                      <Bookmark className="size-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(msg.content, "Response copied to clipboard!")}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="Copy response"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                )}

                {/* User Copy */}
                {msg.role === "user" && (
                  <button
                    onClick={() => copyToClipboard(msg.content, "Message copied to clipboard!")}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/60 transition opacity-60 hover:opacity-100 cursor-pointer"
                    title="Copy message"
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}

                {/* Scope Guardrail Warning Badge */}
                {msg.isScopeInvalid && (
                  <div className="flex items-center gap-2 pb-2 mb-3 border-b border-amber-500/30 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <ShieldAlert className="size-4" />
                    <span>Scope Guardrail Triggered</span>
                  </div>
                )}

                {/* Markdown Content */}
                <div className="prose prose-invert prose-emerald max-w-none text-sm md:text-[15px] leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-lg sm:text-xl font-bold text-zinc-100 mt-5 mb-3 border-b border-zinc-800 pb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-base sm:text-lg font-bold text-zinc-100 mt-4 mb-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mt-3 mb-1.5" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-zinc-100" {...props} />
                      ),
                      p: ({ node, children, ...props }) => {
                        const textStr = React.Children.toArray(children).join("");
                        const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                        const isPredominantlyArabic =
                          arabicMatches.length > 10 && arabicMatches.length / textStr.length > 0.35;

                        const containerClasses =
                          "quran-block my-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-4 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                        if (isPredominantlyArabic) {
                          const isUrdu =
                            /[\u067E\u0686\u0698\u06AF\u0679\u0688\u0691\u06BA\u06D2\u06C1]/.test(textStr) ||
                            /\b(اور|ہیں|تھا|تھی|تھے|کے|کی|کو|سے|نے|میں|پر|کا|یہ|وہ|ایک)\b/.test(textStr);
                          return (
                            <div className={containerClasses}>
                              <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                              <p
                                className={`m-0 ${
                                  isUrdu ? "font-urdu" : "font-arabic"
                                } text-lg md:text-xl text-emerald-200 leading-loose text-right dir-rtl`}
                              >
                                {children}
                              </p>
                            </div>
                          );
                        }

                        const isInlineVerseQuote =
                          /\[Surah \d+:\d+\]|\[Surah [^\]]+\]/i.test(textStr) && textStr.includes('"');
                        if (isInlineVerseQuote && textStr.length < 350 && !textStr.toLowerCase().includes("tafsir")) {
                          return (
                            <div className={containerClasses}>
                              <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                              <p className="m-0 italic text-sm sm:text-base text-zinc-200">{children}</p>
                            </div>
                          );
                        }

                        return (
                          <p className="mb-3 leading-relaxed text-zinc-300 [&:last-child]:mb-0" {...props}>
                            {renderInlineBadges(children)}
                          </p>
                        );
                      },
                      blockquote: ({ node, children }) => {
                        let textStr = "";
                        React.Children.forEach(children, (c) => {
                          if (typeof c === "string") textStr += c;
                          else if (React.isValidElement(c) && (c as any).props?.children) {
                            textStr += React.Children.toArray((c as any).props.children).join("");
                          }
                        });
                        const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                        const isPredominantlyArabic =
                          arabicMatches.length > 10 && arabicMatches.length / textStr.length > 0.35;
                        const containerClasses =
                          "quran-block my-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-4 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                        return (
                          <div className={containerClasses}>
                            <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                            <blockquote
                              className={`m-0 border-none p-0 text-zinc-200 ${
                                isPredominantlyArabic
                                  ? `${amiri.className} text-lg md:text-xl leading-loose text-right text-emerald-200`
                                  : "italic text-sm sm:text-base text-zinc-200"
                              }`}
                            >
                              {renderInlineBadges(children)}
                            </blockquote>
                          </div>
                        );
                      },
                      li: ({ node, children, ...props }) => (
                        <li className="mb-1 text-zinc-300" {...props}>
                          {renderInlineBadges(children)}
                        </li>
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3.5 sm:mt-5 sm:pt-4 border-t border-zinc-800/90 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Classical Citations ({msg.sources.length}):</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 shrink-0">Click reference to open</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.sources.map((src, i) => (
                        <Link
                          key={i}
                          href={
                            src.workType === "textbook"
                              ? "/-Dream-Textbook.pdf"
                              : src.workType === "lexicon"
                              ? `/lexicon?root=${src.rootWord || "رحم"}&author=${encodeURIComponent(src.authorName || src.book)}`
                              : `/tafsir?surah=${src.surah || 1}&ayah=${src.ayah || 1}&author=${encodeURIComponent(src.authorName || src.book)}`
                          }
                          target={src.workType === "textbook" ? "_blank" : "_self"}
                          className="group p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors flex items-center gap-1 truncate">
                              {src.workType === "textbook" ? (
                                <BookOpen className="size-3 text-indigo-400 shrink-0" />
                              ) : src.workType === "lexicon" ? (
                                <Layers className="size-3 text-rose-400 shrink-0" />
                              ) : (
                                <BookOpen className="size-3 text-emerald-400 shrink-0" />
                              )}
                              <span className="truncate">{src.book}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:border-emerald-500/30 group-hover:text-emerald-300 shrink-0">
                              {src.workType === "textbook"
                                ? "PDF"
                                : src.workType === "lexicon"
                                ? `Root: [${src.rootWord}]`
                                : `${src.surah}:${src.ayah}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 line-clamp-2 leading-snug">
                            {src.snippet}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 sm:gap-4">
              <div className="shrink-0 size-9 sm:size-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="size-4 sm:size-5 text-emerald-400" />
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl rounded-tl-xs px-5 py-4 flex items-center gap-3 shadow-md">
                <Loader2 className="size-4 animate-spin text-emerald-400 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs sm:text-sm font-medium text-zinc-200">
                    Querying classical texts with {currentBot.shortName}...
                  </span>
                  <span className="text-[11px] text-zinc-500">Retrieving & synthesizing authentic sources</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Composer Footer (Gemini / LLM Model Picker Style Inside Input Box) */}
      <footer className="shrink-0 bg-zinc-950 border-t border-zinc-800/80 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-5">
        <div className="max-w-[950px] mx-auto">
          
          {/* Integrated Glassmorphism Chat Box */}
          <div className="relative rounded-3xl bg-zinc-900/90 border border-zinc-800/90 p-3 sm:p-4 shadow-2xl focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500/50 transition-all">
            
            {/* Top Toolbar inside Chat Box: Model/Bot Selector Pill */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-1.5 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                
                {/* Gemini-Style LLM Model Selector Dropdown */}
                <Select value={activeModeId} onValueChange={handleSwitchMode}>
                  <SelectTrigger className="w-auto h-auto py-1 px-3 bg-zinc-950/90 border-zinc-800/90 hover:border-emerald-500/40 text-emerald-400 font-semibold text-xs rounded-full focus:ring-0 focus:ring-offset-0 gap-1.5 shadow-sm inline-flex items-center cursor-pointer transition-colors">
                    <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold">{currentBot.shortName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono hidden xs:inline">({currentBot.id})</span>
                    <ChevronDown className="size-3 text-zinc-400 shrink-0 ml-0.5" />
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

                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border hidden sm:inline ${currentBot.badgeColor}`}>
                  {currentBot.badge}
                </span>
              </div>

              <div className="text-[11px] text-zinc-500 font-mono hidden md:inline">
                {currentBot.sources.length} Indexed Classical Sources
              </div>
            </div>

            {/* Middle: Textarea Prompt Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${currentBot.botTitle}... (Press Enter to send)`}
              className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none placeholder-zinc-500 text-[15px] sm:text-base text-zinc-100 resize-none min-h-[50px] sm:min-h-[56px] max-h-[160px] custom-scrollbar py-1"
              rows={1}
            />

            {/* Bottom Row inside Chat Box: Actions & Send Button */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/40">
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <BookOpen className="size-3.5 text-emerald-500/70" />
                <span className="truncate max-w-[240px] sm:max-w-[400px]">
                  {currentBot.sources.slice(0, 2).join(", ")}
                  {currentBot.sources.length > 2 && ` +${currentBot.sources.length - 2} more`}
                </span>
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="size-9 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
                title="Send Message"
              >
                <Send className="size-4" />
              </button>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}

export default function RagChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-zinc-950 flex items-center justify-center text-zinc-400">
          <Loader2 className="size-6 animate-spin text-emerald-500" />
        </div>
      }
    >
      <RagChatContent />
    </Suspense>
  );
}
