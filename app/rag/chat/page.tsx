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
  Info
} from "lucide-react";
import { inter, amiri } from "@/app/fonts";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";

interface SourceItem {
  id: string;
  book: string;
  authorName: string;
  surah?: number | null;
  ayah?: number | null;
  rootWord?: string | null;
  snippet: string;
  workType: "tafsir" | "lexicon";
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isScopeInvalid?: boolean;
  sources?: SourceItem[];
}

function RagChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeModeId = searchParams.get("mode") || "default";

  const currentModeInfo = RAG_MODES.find((m) => m.id === activeModeId) || RAG_MODES[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `As-salamu alaykum! I am the Quranic RAG Engine operating in **${currentModeInfo.name}**.\n\nI will retrieve and synthesize insights strictly from:\n${currentModeInfo.sources.map(s => `- *${s}*`).join("\n")}\n\nAsk me your inquiry below!`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingReqs, setRemainingReqs] = useState<number | null>(null);
  const [isModeSwitcherOpen, setIsModeSwitcherOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // If mode changes via URL, reset conversation greeting
  useEffect(() => {
    const info = RAG_MODES.find((m) => m.id === activeModeId) || RAG_MODES[0];
    setMessages([
      {
        role: "assistant",
        content: `As-salamu alaykum! Switched to **${info.name}**.\n\nSearching strictly within:\n${info.sources.map(s => `- *${s}*`).join("\n")}\n\nHow can I help you?`
      }
    ]);
  }, [activeModeId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: Message = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, mode: activeModeId })
      });

      const data = await res.json();

      if (!data.success && !data.isScopeInvalid) {
        throw new Error(data.error || "Failed to generate response.");
      }

      if (data.remaining !== undefined) {
        setRemainingReqs(data.remaining);
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
    } catch (err: any) {
      toast.error(err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error while retrieving classical texts. Please try again or switch modes." }
      ]);
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
    <div className={`min-h-screen flex flex-col bg-zinc-950 text-white ${inter.className}`}>
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/rag"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-sm font-medium transition-all text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>RAG Hub</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />
            <div className="hidden sm:flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <span className="font-bold text-sm md:text-base text-white">Quranic RAG Engine</span>
            </div>
          </div>

          {/* Mode Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsModeSwitcherOpen(!isModeSwitcherOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs sm:text-sm font-semibold text-emerald-400 transition-all shadow-sm"
            >
              <span>Mode: {currentModeInfo.name.split(". ")[1] || currentModeInfo.name}</span>
              <ChevronDown className={`size-4 transition-transform ${isModeSwitcherOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Mode Dropdown Menu */}
            {isModeSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-[320px] sm:w-[380px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  Switch Active RAG Mode
                </div>
                {RAG_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSwitchMode(m.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex flex-col gap-1 ${
                      m.id === activeModeId
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-white"
                        : "hover:bg-zinc-800/70 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{m.name}</span>
                      {m.id === activeModeId && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] text-zinc-400 line-clamp-1">{m.targetIntent}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 font-medium">
            <AlertCircle className="size-3.5 text-emerald-500" />
            <span>{remainingReqs !== null ? `${remainingReqs} Free Requests Left` : "Free Tier Hybrid RAG"}</span>
          </div>
        </div>
      </nav>

      {/* Mode Warning Banner (if niche mode active) */}
      {currentModeInfo.warning && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 text-amber-400 shrink-0" />
            <span><strong>Guardrail Active:</strong> {currentModeInfo.warning}</span>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-[900px] mx-auto space-y-6 pb-24">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 size-10 rounded-full flex items-center justify-center shadow-md ${
                  msg.role === "user"
                    ? "bg-zinc-800 border border-zinc-700"
                    : msg.isScopeInvalid
                    ? "bg-amber-500/20 border border-amber-500/40"
                    : "bg-emerald-500/20 border border-emerald-500/40"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-5 text-zinc-300" />
                ) : msg.isScopeInvalid ? (
                  <ShieldAlert className="size-5 text-amber-400" />
                ) : (
                  <Bot className="size-5 text-emerald-400" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-5 py-4.5 shadow-sm ${
                  msg.role === "user"
                    ? "bg-zinc-800/90 border border-zinc-700/60 rounded-tr-sm"
                    : msg.isScopeInvalid
                    ? "bg-amber-950/30 border border-amber-500/40 rounded-tl-sm text-amber-100"
                    : "bg-zinc-900/60 border border-zinc-800/90 rounded-tl-sm"
                }`}
              >
                {msg.isScopeInvalid && (
                  <div className="flex items-center gap-2 pb-2 mb-3 border-b border-amber-500/30 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <ShieldAlert className="size-4" />
                    <span>Scope Guardrail Triggered</span>
                  </div>
                )}

                <div className="prose prose-invert prose-emerald max-w-none text-sm md:text-base leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-emerald-500" />
                        <span>Sources Used from {currentModeInfo.name.split(". ")[1] || "Classical Texts"}:</span>
                      </span>
                      <span className="text-[11px] text-zinc-500">Click to view in Library</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.sources.map((src, i) => (
                        <Link
                          key={i}
                          href={
                            src.workType === "lexicon"
                              ? `/lexicon?root=${src.rootWord || "رحم"}`
                              : `/tafsir?surah=${src.surah || 1}&ayah=${src.ayah || 1}`
                          }
                          className="group p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                              {src.workType === "lexicon" ? <Layers className="size-3 text-rose-400" /> : <BookOpen className="size-3 text-emerald-400" />}
                              <span>{src.book}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:border-emerald-500/30 group-hover:text-emerald-300">
                              {src.workType === "lexicon" ? `Root: [${src.rootWord}]` : `${src.surah}:${src.ayah}`}
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
            <div className="flex gap-4">
              <div className="shrink-0 size-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="size-5 text-emerald-400" />
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl rounded-tl-sm px-6 py-5 flex items-center gap-3 shadow-sm">
                <Loader2 className="size-4 animate-spin text-emerald-500" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-zinc-300">Searching classical {currentModeInfo.name.split(". ")[1] || "texts"}...</span>
                  <span className="text-xs text-zinc-500">Stage 1 Router & BM25 + Vector Retrieval in progress</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Sticky Input Area */}
      <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 p-4">
        <div className="max-w-[900px] mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask in ${currentModeInfo.name.split(". ")[1] || "Default Mode"}... (e.g. ${
              activeModeId === "grammar"
                ? "Explain the i'rab of Surah Al-Fatiha verse 5"
                : activeModeId === "lexicon"
                ? "What is the classical root definition of 'رحم'?"
                : "What did classical scholars comment on Surah 2 Ayah 255?"
            })`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl pl-4 pr-14 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none min-h-[60px] max-h-[180px] custom-scrollbar shadow-inner"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3.5 size-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="text-center mt-2.5">
          <p className="text-[11px] text-zinc-600 font-medium">
            Active Mode: <span className="text-emerald-500/90 font-semibold">{currentModeInfo.name.split(". ")[1] || currentModeInfo.name}</span> — 2-LLM Guardrail & Citation Engine. Always verify theological rulings with certified scholars.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RagChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    }>
      <RagChatContent />
    </Suspense>
  );
}
