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
  Lightbulb,
  ScrollText,
  PenLine,
  FileText,
  Heart,
  Brain,
  Clock,
  Search,
  X
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

import SourceChunkViewer, { SourceItem } from "@/components/ai/SourceChunkViewer";
import GeminiInputComposer from "@/components/ai/GeminiInputComposer";

function getChipIcon(iconName: string) {
  switch (iconName) {
    case "book":
      return BookOpen;
    case "sparkles":
      return Sparkles;
    case "compass":
      return Compass;
    case "scroll":
      return ScrollText;
    case "pen":
      return PenLine;
    case "file":
      return FileText;
    case "layers":
      return Layers;
    case "heart":
      return Heart;
    case "brain":
      return Brain;
    case "clock":
      return Clock;
    case "lightbulb":
      return Lightbulb;
    case "search":
      return Search;
    default:
      return Sparkles;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isScopeInvalid?: boolean;
  sources?: SourceItem[];
}

function findSourceForBadge(badgeText: string, sources?: SourceItem[]): SourceItem | undefined {
  if (!sources || sources.length === 0) return undefined;

  const text = badgeText.toLowerCase().trim();

  // Try to extract Surah & Ayah numbers: e.g. "24:32" or "Surah 24:32" or "24, 32"
  const surahAyahMatch = text.match(/(?:surah\s*)?(\d+)\s*[:：,\s]\s*(\d+)/i);
  const targetSurah = surahAyahMatch ? parseInt(surahAyahMatch[1], 10) : null;
  const targetAyah = surahAyahMatch ? parseInt(surahAyahMatch[2], 10) : null;

  // Author keywords mapping
  const authorKeywords = [
    { key: "tabari", pattern: /tabari|طبري/i },
    { key: "kathir", pattern: /kathir|كثير/i },
    { key: "qurtubi", pattern: /qurtubi|قرطبي/i },
    { key: "saadi", pattern: /sa'?di|سعدي/i },
    { key: "baghawi", pattern: /baghawi|بغوي/i },
    { key: "razi", pattern: /razi|رازي/i },
    { key: "alusi", pattern: /alusi|آلوسي/i },
    { key: "muyassar", pattern: /muyassar|ميسر/i },
    { key: "jalalayn", pattern: /jalalayn|جلالين/i },
    { key: "wasit", pattern: /wasit|وسيط/i },
    { key: "adwa", pattern: /adwa|أضواء/i },
    { key: "tahrir", pattern: /tahrir|تحرير/i },
    { key: "lisan", pattern: /lisan|لسان/i },
    { key: "mufradat", pattern: /mufradat|مفردات/i },
    { key: "maqayis", pattern: /maqayis|مقاييس/i },
    { key: "qamus", pattern: /qamus|قاموس/i },
    { key: "shihah", pattern: /shihah|صحاح/i },
    { key: "lane", pattern: /lane/i },
    { key: "dream", pattern: /dream/i },
  ];

  // Match by author keyword
  const matchedKeyword = authorKeywords.find((ak) => ak.pattern.test(text));
  if (matchedKeyword) {
    const authorMatches = sources.filter(
      (s) =>
        matchedKeyword.pattern.test(s.authorName || "") ||
        matchedKeyword.pattern.test(s.book || "")
    );
    if (authorMatches.length > 0) {
      if (targetSurah && targetAyah) {
        const exact = authorMatches.find(
          (s) => s.surah === targetSurah && s.ayah === targetAyah
        );
        if (exact) return exact;
      }
      if (targetSurah) {
        const surahOnly = authorMatches.find((s) => s.surah === targetSurah);
        if (surahOnly) return surahOnly;
      }
      return authorMatches[0];
    }
  }

  // If no author match, but surah and ayah are found
  if (targetSurah && targetAyah) {
    const exact = sources.find((s) => s.surah === targetSurah && s.ayah === targetAyah);
    if (exact) return exact;
  }

  // Root word match if in badge
  const rootMatch = sources.find(
    (s) => s.rootWord && text.includes(s.rootWord.toLowerCase())
  );
  if (rootMatch) return rootMatch;

  // Partial author or book name match
  const looseMatch = sources.find((s) => {
    const combined = (s.book + " " + (s.authorName || "")).toLowerCase();
    const words = text.split(/[\s,.-]+/);
    return words.some((w) => w.length > 3 && combined.includes(w));
  });
  if (looseMatch) return looseMatch;

  return sources[0];
}

const renderInlineBadges = (
  children: React.ReactNode,
  sources?: SourceItem[],
  onSelectSource?: (source: SourceItem) => void
): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = child.split(/(\[[^\]]+\])/g);
      return parts.map((part, i) => {
        const isCitation =
          part.startsWith("[") &&
          part.endsWith("]") &&
          part.length > 2 &&
          (
            part.includes("Tafsir") ||
            part.includes("Surah") ||
            part.includes("Ayah") ||
            part.includes("Source") ||
            part.includes("Adwa") ||
            part.includes("Kathir") ||
            part.includes("Tabari") ||
            part.includes("Qurtubi") ||
            part.includes("Wasit") ||
            part.includes("Saadi") ||
            part.includes("Sa'di") ||
            part.includes("Baghawi") ||
            part.includes("Razi") ||
            part.includes("Alusi") ||
            part.includes("Muyassar") ||
            part.includes("Jalalayn") ||
            part.includes("Tanwir") ||
            part.includes("Tahrir") ||
            part.includes("Zilal") ||
            part.includes("Root") ||
            part.includes("Lexicon") ||
            part.includes("Lisan") ||
            part.includes("Mufradat") ||
            part.includes("Maqayis") ||
            part.includes("Qamus") ||
            part.includes("Shihah") ||
            part.includes("Mu'jam") ||
            part.includes("Lane") ||
            part.includes("Dream") ||
            part.includes("تفسير") ||
            part.includes("سورة") ||
            part.includes("طبري") ||
            part.includes("كثير") ||
            part.includes("قرطبي") ||
            part.includes("بغوي") ||
            part.includes("سعدي") ||
            part.includes("رازي") ||
            part.includes("لسان") ||
            part.includes("مفردات") ||
            part.includes("مقاييس") ||
            part.match(/\[\d+[:：,]\d+\]/) ||
            (sources && sources.some((s) => s.book && part.toLowerCase().includes(s.book.toLowerCase().slice(0, 5))))
          );

        if (isCitation) {
          const badgeText = part.slice(1, -1);
          const matchedSource = findSourceForBadge(badgeText, sources) || {
            id: `badge-${i}`,
            book: badgeText,
            authorName: badgeText.split(",")[0] || badgeText,
            snippet: `Reference: ${badgeText}`,
            chunkText: `Reference cited in classical commentary:\n\n${badgeText}`,
            workType:
              badgeText.toLowerCase().includes("lexicon") ||
              badgeText.toLowerCase().includes("lisan") ||
              badgeText.toLowerCase().includes("root")
                ? "lexicon"
                : "tafsir"
          };

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectSource?.(matchedSource)}
              className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 hover:text-emerald-100 text-[11px] font-mono not-italic align-middle shadow-sm hover:shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all group"
              title="Click to view retrieved chunk from this source"
            >
              <BookOpen className="size-2.5 text-emerald-400 group-hover:text-emerald-300 shrink-0 inline" />
              <span className="underline decoration-emerald-500/40 underline-offset-2 group-hover:decoration-emerald-300">
                {badgeText}
              </span>
            </button>
          );
        }
        return part;
      });
    }
    if (React.isValidElement(child) && (child as any).props?.children) {
      return React.cloneElement(child, {
        ...(child as any).props,
        children: renderInlineBadges((child as any).props.children, sources, onSelectSource)
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
  const [showDisclaimers, setShowDisclaimers] = useState<boolean>(false);
  const [activeSource, setActiveSource] = useState<SourceItem | null>(null);
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
    setShowDisclaimers(false);
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

  return (
    <div className={`flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-zinc-950 text-white ${inter.className}`}>
      {/* Top Header */}
      <header className="shrink-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 px-3 sm:px-6 py-3 shadow-lg">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/home"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 text-xs font-medium transition-all text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="size-8 sm:size-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                <Bot className="size-4 sm:size-5 text-emerald-400" />
              </div>
              <span className="font-bold text-sm sm:text-base text-white tracking-tight">AI Scholar</span>
            </div>
          </div>

          {/* Right: Actions & Quota */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Disclaimers Toggle Button */}
            <button
              onClick={() => setShowDisclaimers(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 text-xs font-medium transition-all cursor-pointer"
              title="View Notes & Disclaimers"
            >
              <Info className="size-3.5 text-emerald-400" />
              <span className="hidden md:inline">Notes & Disclaimers</span>
              {currentBot.warning && (
                <span className="size-1.5 rounded-full bg-amber-400" title="Guardrail active" />
              )}
            </button>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-950/30 text-xs text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 className="size-3.5" />
                <span className="hidden lg:inline">Clear</span>
              </button>
            )}

            {/* Token Quota Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 font-medium">
              <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
              {remainingTokens !== null ? (
                <span>
                  <strong className="text-emerald-400">{(tokenLimit - remainingTokens).toLocaleString()}</strong>
                  <span className="text-zinc-500">/{tokenLimit.toLocaleString()}</span>
                </span>
              ) : (
                <span>Active</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area (Split View on Desktop when activeSource is open) */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Chat Left Column */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Main Scrollable Area */}
          <main
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 md:p-8 custom-scrollbar overscroll-contain"
          >
        <div className="max-w-[950px] mx-auto space-y-6 pb-6">

          {/* Clean Default View (when no messages) */}
          {messages.length === 0 && (
            <div className="min-h-[calc(100dvh-10rem)] flex flex-col items-center justify-center text-center px-2 sm:px-4 py-8 max-w-3xl mx-auto animate-in fade-in duration-300">
              
              {/* Tafsir Name & Mode Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-xs text-zinc-300 mb-6 shadow-sm max-w-full overflow-hidden">
                <BookOpen className="size-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white shrink-0">{currentBot.shortName}</span>
                <span className="text-zinc-600 shrink-0">•</span>
                <span className="text-zinc-400 truncate max-w-[260px] sm:max-w-[420px]">
                  {currentBot.sources.join(" • ")}
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                Your Source for Tafsir and Classical Lexicon
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">
                {currentBot.targetIntent}
              </p>

              {/* Search / Input Box like Gemini */}
              <div className="w-full max-w-2xl mx-auto mb-5 sm:mb-6">
                <GeminiInputComposer
                  input={input}
                  setInput={setInput}
                  onSend={handleSend}
                  isLoading={isLoading}
                  activeModeId={activeModeId}
                  onSwitchMode={handleSwitchMode}
                  currentBot={currentBot}
                  autoFocus
                />
              </div>

              {/* Suggested Question Chips (Pills like the pic) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-2xl mx-auto">
                {(currentBot.suggestedChips || []).map((chip, idx) => {
                  const IconComp = getChipIcon(chip.icon);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(chip.prompt)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-800/80 text-zinc-300 hover:text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer group"
                      title={chip.prompt}
                    >
                      <IconComp className="size-3.5 text-emerald-400/80 group-hover:text-emerald-300 shrink-0" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Discreet Notes & Disclaimers button below chips */}
              <button
                onClick={() => setShowDisclaimers(true)}
                className="mt-6 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Info className="size-3 text-emerald-500/70" />
                <span>Notes & Disclaimers</span>
              </button>
            </div>
          )}

          {/* Chat Messages Feed */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-3.5 sm:px-6 sm:py-5 shadow-md relative group ${
                  msg.role === "user"
                    ? "max-w-[90%] sm:max-w-[80%] bg-zinc-800/90 border border-zinc-700/70 text-zinc-100 pr-10"
                    : msg.isScopeInvalid
                    ? "w-full bg-amber-950/30 border border-amber-500/40 text-amber-100"
                    : "w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100"
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
                                {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
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
                              <p className="m-0 italic text-sm sm:text-base text-zinc-200">
                                {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <p className="mb-3 leading-relaxed text-zinc-300 [&:last-child]:mb-0" {...props}>
                            {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
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
                              {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
                            </blockquote>
                          </div>
                        );
                      },
                      li: ({ node, children, ...props }) => (
                        <li className="mb-1 text-zinc-300" {...props}>
                          {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
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
                              ? `/lexicon?root=${encodeURIComponent(src.rootWord || "رحم")}&author=${encodeURIComponent(src.authorName || src.book)}`
                              : `/tafsir?surah=${src.surah || 1}&ayah=${src.ayah || 1}&author=${encodeURIComponent(src.authorName || src.book)}`
                          }
                          target={src.workType === "textbook" ? "_blank" : "_self"}
                          className="group p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left space-y-1 block"
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
            <div className="flex justify-start">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-md">
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

      {/* Input Composer Footer (Gemini Sleek Capsule Style) - only shown during active chat */}
      {messages.length > 0 && (
        <footer className="shrink-0 bg-zinc-950 border-t border-zinc-800/80 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-5">
          <div className="max-w-[850px] mx-auto">
            <GeminiInputComposer
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              activeModeId={activeModeId}
              onSwitchMode={handleSwitchMode}
              currentBot={currentBot}
              autoFocus
            />

            {/* Subtle Sources & Disclaimers Caption */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 pt-2 px-3 text-center">
              <span>AI can hallucinate — always cross-check with cited sources.</span>
              <span className="hidden sm:inline">•</span>
              <button
                type="button"
                onClick={() => setShowDisclaimers(true)}
                className="underline hover:text-zinc-400 transition-colors cursor-pointer"
              >
                Notes & Disclaimers
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>

    {/* Right: Desktop Sidebar */}
    {activeSource && (
      <aside className="hidden md:flex w-[400px] lg:w-[460px] xl:w-[500px] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-950 shadow-2xl z-20 animate-in slide-in-from-right duration-300">
        <SourceChunkViewer
          source={activeSource}
          onClose={() => setActiveSource(null)}
          isMobile={false}
        />
      </aside>
    )}
  </div>

  {/* Mobile Bottom Sheet Modal */}
  {activeSource && (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={() => setActiveSource(null)}
        aria-label="Close modal backdrop"
      />
      <div className="relative w-full max-h-[88vh] h-[82vh] flex flex-col rounded-t-3xl border-t border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 z-10">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto my-2.5 shrink-0" />
        <div className="flex-1 min-h-0">
          <SourceChunkViewer
            source={activeSource}
            onClose={() => setActiveSource(null)}
            isMobile={true}
          />
        </div>
      </div>
    </div>
  )}

  {/* Notes & Disclaimers Modal */}
  {showDisclaimers && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={() => setShowDisclaimers(false)}
        aria-label="Close modal backdrop"
      />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Info className="size-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Academic Notes & Disclaimers
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentBot.badgeColor}`}>
                  {currentBot.badge}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {currentBot.botTitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDisclaimers(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Guardrail Warning if exists */}
          {currentBot.warning && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Active Guardrail</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {currentBot.warning}
              </p>
            </div>
          )}

          {/* Disclaimer & Scope Rules */}
          <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Scope Rules & Legal Disclaimer</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {currentBot.disclaimer}
            </p>
            <div className="pt-2.5 border-t border-zinc-800 space-y-2">
              <div className="text-[11px] text-amber-300/95 flex items-start gap-1.5 leading-relaxed">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>AI Generation & Hallucination Notice:</strong> Answers are generated by artificial intelligence and can hallucinate or contain inaccuracies. Always remember to cross-check and verify information from the cited classical sources provided with every response.
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0 text-zinc-500" />
                <span>Always consult qualified human scholars (Ulama) for binding rulings.</span>
              </div>
            </div>
          </div>

          {/* Bot Usage Notes */}
          <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Usage Notes</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {currentBot.usageNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span>{note}</span>
                </li>
              ))}
              <li className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span>
                  <strong>Cross-Check Citations:</strong> Because answers are generated by AI, hallucination is possible. Always review and cross-check the claims with the cited sources and referenced source chunks.
                </span>
              </li>
            </ul>
          </div>

          {/* Queried Classical Sources */}
          <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <BookOpen className="size-4 text-emerald-400 shrink-0" />
              <span>Primary Indexed Sources for {currentBot.shortName}:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentBot.sources.map((src, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5"
                >
                  <BookOpen className="size-3 text-emerald-500 shrink-0" />
                  <span>{src}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end shrink-0">
          <button
            onClick={() => setShowDisclaimers(false)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )}
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
