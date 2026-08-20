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
  Bookmark
} from "lucide-react";
import { inter, amiri } from "@/app/fonts";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useVisualViewportOffset } from '@/hooks/useVisualViewport';
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import { copyToClipboard } from "@/lib/utils";
import { saveScholarAnswer } from "@/lib/readerStorage";

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
  return React.Children.map(children, child => {
    if (typeof child === 'string') {
      const parts = child.split(/(\[[^\]]+\])/g);
      return parts.map((part, i) => {
        if (
          part.startsWith('[') && 
          part.endsWith(']') && 
          part.length > 2 && 
          (
            part.includes('Tafsir') || 
            part.includes('Surah') || 
            part.includes('Adwa') || 
            part.includes('Kathir') || 
            part.includes('Tabari') || 
            part.includes('Qurtubi') || 
            part.includes('Wasit') || 
            part.includes('Root') || 
            part.includes('Lexicon') || 
            part.includes('Lisan') || 
            part.includes('Mufradat') || 
            part.includes('Maqayis') || 
            part.includes('Qamus') || 
            part.includes('Shihah') || 
            part.includes("Mu'jam") || 
            part.match(/\[\d+:\d+\]/)
          )
        ) {
          const badgeText = part.slice(1, -1);
          return (
            <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-emerald-950/20 border border-emerald-500/15 text-emerald-400/75 text-[11px] font-mono not-italic align-middle opacity-80 hover:opacity-100 transition-opacity">
              <BookOpen className="size-2.5 text-emerald-500/60 shrink-0 inline" />
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

  const currentModeInfo = RAG_MODES.find((m) => m.id === activeModeId) || RAG_MODES[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `As-salamu alaykum! I am **Sheikh Juthur**, your Quranic RAG Engine operating in **${currentModeInfo.name}**.\n\nI will retrieve and synthesize insights strictly from:\n${currentModeInfo.sources.map(s => `- *${s}*`).join("\n")}\n\nAsk me your inquiry below!`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);
  const [isModeSwitcherOpen, setIsModeSwitcherOpen] = useState(false);
  useVisualViewportOffset();

  useEffect(() => {
    // Fetch remaining tokens on mount
    fetch('/api/ai/rag')
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data?.success) {
          setRemainingTokens(data.remaining);
          if (data.limit) setTokenLimit(data.limit);
        }
      })
      .catch(console.error);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const hasUserInteracted = useRef(false);

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

  // If mode changes via URL, reset conversation greeting & scroll position to top
  useEffect(() => {
    hasUserInteracted.current = false;
    const info = RAG_MODES.find((m) => m.id === activeModeId) || RAG_MODES[0];
    setMessages([
      {
        role: "assistant",
        content: `As-salamu alaykum! I am **Sheikh Juthur**. Switched to **${info.name}**.\n\nSearching strictly within:\n${info.sources.map(s => `- *${s}*`).join("\n")}\n\nHow can I help you?`
      }
    ]);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeModeId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsScrolledUp(false); // Force scroll to bottom on new message
    hasUserInteracted.current = true;

    try {
      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, mode: activeModeId })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        // Handle immediate JSON responses (e.g., LLM 1 Guardrail triggers or quota errors)
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

      // Handle Streaming SSE for LLM 2
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream available.");

      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantMessage: Message = { role: "assistant", content: "", sources: [] };
      
      // Append an empty assistant message first
      setMessages((prev) => [...prev, assistantMessage]);

      let lastUpdateTime = Date.now();
      let streamBuffer = "";
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split("\n");
          // Keep the last incomplete fragment in the buffer until the next chunk arrives
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
                // Ignore incomplete JSON chunks from SSE chunking
              }
            }
          }
          
          // Throttle React state updates to every 50ms to prevent stream glitching
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
          { role: "assistant", content: "Sorry, I encountered an error while retrieving classical texts. Please try again or switch modes." }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSwitchMode = (modeId: string) => {
    setIsModeSwitcherOpen(false);
    router.push(`/rag/chat?mode=${modeId}`);
  };

  return (
    <div className={`flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-zinc-950 text-white ${inter.className}`}>
      {/* Top Navigation */}
      <nav className="shrink-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-3 sm:px-4 md:px-8 py-2.5 sm:py-3.5 shadow-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/rag"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-xs sm:text-sm font-medium transition-all text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span className="whitespace-nowrap">RAG Hub</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />
            <div className="hidden sm:flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <span className="font-bold text-sm md:text-base text-white whitespace-nowrap">Quranic RAG Engine</span>
            </div>
          </div>

          {/* Mode Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsModeSwitcherOpen(!isModeSwitcherOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs sm:text-sm font-semibold text-emerald-400 transition-all shadow-sm"
            >
              <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[220px]">Mode: {currentModeInfo.shortName}</span>
              <ChevronDown className={`size-3.5 sm:size-4 shrink-0 transition-transform ${isModeSwitcherOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Mode Dropdown Menu */}
            {isModeSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-[280px] xs:w-[320px] sm:w-[380px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  Switch Active RAG Mode
                </div>
                {RAG_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSwitchMode(m.id)}
                    className={`w-full text-left px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-all flex flex-col gap-0.5 sm:gap-1 ${
                      m.id === activeModeId
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-white"
                        : "hover:bg-zinc-800/70 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{m.name}</span>
                      {m.id === activeModeId && <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[11px] text-zinc-400 line-clamp-1">{m.targetIntent}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-[10px] sm:text-xs text-zinc-400 font-medium shadow-sm shrink-0">
            <Sparkles className="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
            {remainingTokens !== null ? (
              <span>
                <strong className="text-emerald-400">{(tokenLimit - remainingTokens).toLocaleString()}</strong> / {tokenLimit.toLocaleString()} <span className="hidden xs:inline">Tokens</span> Used
              </span>
            ) : (
              <span>Free Tier RAG</span>
            )}
          </div>
        </div>
      </nav>

      {/* Mode Warning Banner (if niche mode active) */}
      {currentModeInfo.warning && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-3 sm:px-4 py-2 text-xs text-amber-200">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span className="line-clamp-2 sm:line-clamp-none"><strong>Guardrail Active:</strong> {currentModeInfo.warning}</span>
          </div>
        </div>
      )}

      {/* Chat Area — ONLY thing that scrolls, min-h-0 prevents flex expansion */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-8 custom-scrollbar overscroll-contain"
      >
        <div className="max-w-[900px] mx-auto space-y-4 sm:space-y-6 pb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 size-8 sm:size-10 rounded-full flex items-center justify-center shadow-md ${
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
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm relative group ${
                  msg.role === "user"
                    ? "bg-zinc-800/90 border border-zinc-700/60 rounded-tr-sm text-zinc-200"
                    : msg.isScopeInvalid
                    ? "bg-amber-950/30 border border-amber-500/40 rounded-tl-sm text-amber-100"
                    : "bg-zinc-900/80 border border-zinc-800/90 rounded-tl-sm text-zinc-200"
                }`}
              >
                {msg.role === "assistant" && idx > 0 && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                    <button
                      onClick={() => {
                        const previousUserMsg = messages.slice(0, idx).reverse().find(m => m.role === "user");
                        const questionText = previousUserMsg?.content || "Quranic RAG Inquiry";
                        saveScholarAnswer({
                          id: `scholar_${Date.now()}_${idx}`,
                          question: questionText,
                          answer: msg.content,
                          modeName: currentModeInfo.name,
                          sources: msg.sources?.map(s => ({
                            book: s.book,
                            authorName: s.authorName,
                            snippet: s.snippet
                          })),
                          timestamp: Date.now()
                        });
                        toast.success("Saved Scholar research answer to Profile!");
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition cursor-pointer"
                      title="Save Answer to Profile"
                    >
                      <Bookmark className="size-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(msg.content, "Response copied to clipboard!")}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition cursor-pointer"
                      title="Copy response"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                )}

                {msg.role === "user" && (
                  <button
                    onClick={() => copyToClipboard(msg.content, "Message copied to clipboard!")}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Copy message"
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}
                {msg.isScopeInvalid && (
                  <div className="flex items-center gap-2 pb-2 mb-3 border-b border-amber-500/30 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <ShieldAlert className="size-4" />
                    <span>Scope Guardrail Triggered</span>
                  </div>
                )}

                <div className="prose prose-invert prose-emerald max-w-none text-sm md:text-[15px] leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-lg sm:text-xl font-bold text-zinc-100 mt-5 mb-3 border-b border-zinc-800 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base sm:text-lg font-bold text-zinc-100 mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mt-3 mb-1.5" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-zinc-100" {...props} />,
                      p: ({node, children, ...props}) => {
                        const textStr = React.Children.toArray(children).join('');
                        const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                        const isPredominantlyArabic = arabicMatches.length > 10 && (arabicMatches.length / textStr.length > 0.35);
                        
                        const containerClasses = "quran-block my-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-4 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                        if (isPredominantlyArabic) {
                          const isUrdu = /[\u067E\u0686\u0698\u06AF\u0679\u0688\u0691\u06BA\u06D2\u06C1]/.test(textStr) || /\b(اور|ہیں|تھا|تھی|تھے|کے|کی|کو|سے|نے|میں|پر|کا|یہ|وہ|ایک)\b/.test(textStr);
                          return (
                            <div className={containerClasses}>
                              <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                              <p className={`m-0 ${isUrdu ? 'font-urdu' : 'font-arabic'} text-lg md:text-xl text-emerald-200 leading-loose text-right dir-rtl`}>
                                {children}
                              </p>
                            </div>
                          );
                        }

                        const isInlineVerseQuote = /\[Surah \d+:\d+\]|\[Surah [^\]]+\]/i.test(textStr) && textStr.includes('"');
                        if (isInlineVerseQuote && textStr.length < 350 && !textStr.toLowerCase().includes('tafsir')) {
                          return (
                            <div className={containerClasses}>
                              <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                              <p className="m-0 italic text-sm sm:text-base text-zinc-200">
                                {children}
                              </p>
                            </div>
                          );
                        }

                        return <p className="mb-3 leading-relaxed text-zinc-300 [&:last-child]:mb-0" {...props}>{renderInlineBadges(children)}</p>;
                      },
                      blockquote: ({node, children}) => {
                        let textStr = '';
                        React.Children.forEach(children, c => {
                          if (typeof c === 'string') textStr += c;
                          else if (React.isValidElement(c) && (c as any).props?.children) {
                            textStr += React.Children.toArray((c as any).props.children).join('');
                          }
                        });
                        const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                        const isPredominantlyArabic = arabicMatches.length > 10 && (arabicMatches.length / textStr.length > 0.35);
                        const containerClasses = "quran-block my-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-4 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                        return (
                          <div className={containerClasses}>
                            <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                            <blockquote className={`m-0 border-none p-0 text-zinc-200 ${isPredominantlyArabic ? `${amiri.className} text-lg md:text-xl leading-loose text-right text-emerald-200` : 'italic text-sm sm:text-base text-zinc-200'}`}>
                              {renderInlineBadges(children)}
                            </blockquote>
                          </div>
                        );
                      },
                      li: ({node, children, ...props}) => <li className="mb-1 text-zinc-300" {...props}>{renderInlineBadges(children)}</li>
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 sm:mt-5 sm:pt-4 border-t border-zinc-800/80 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Sources Used ({msg.sources.length}):</span>
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-zinc-500 shrink-0">Click to view</span>
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
                          className="group p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1 truncate">
                              {src.workType === "textbook" ? <BookOpen className="size-3 text-indigo-400 shrink-0" /> : src.workType === "lexicon" ? <Layers className="size-3 text-rose-400 shrink-0" /> : <BookOpen className="size-3 text-emerald-400 shrink-0" />}
                              <span className="truncate">{src.book}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:border-emerald-500/30 group-hover:text-emerald-300 shrink-0">
                              {src.workType === "textbook" ? "PDF Reference" : src.workType === "lexicon" ? `Root: [${src.rootWord}]` : `${src.surah}:${src.ayah}`}
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

          {isLoading && (
            <div className="flex gap-2.5 sm:gap-4">
              <div className="shrink-0 size-8 sm:size-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="size-4 sm:size-5 text-emerald-400" />
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl rounded-tl-sm px-4 py-3 sm:px-6 sm:py-5 flex items-center gap-3 shadow-sm">
                <Loader2 className="size-4 animate-spin text-emerald-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs sm:text-sm font-medium text-zinc-300">Searching classical texts...</span>
                  <span className="text-[11px] text-zinc-500">Stage 1 Router & BM25 + Vector Retrieval</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Bar — normal flex child at bottom, resizes natively with keyboard */}
      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800/80 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        <div className="max-w-[900px] mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask in ${currentModeInfo.shortName}...`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl pl-3.5 pr-12 py-3 sm:pl-4 sm:pr-14 sm:py-3.5 text-[16px] sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none min-h-[50px] sm:min-h-[56px] max-h-[140px] custom-scrollbar shadow-inner"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 sm:right-3 sm:bottom-3 size-8 sm:size-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] sm:text-[11px] text-zinc-500 font-medium truncate px-2">
            Active Mode: <span className="text-emerald-400 font-semibold">{currentModeInfo.shortName}</span> — Verified Citations Engine
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RagChatPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    }>
      <RagChatContent />
    </Suspense>
  );
}
