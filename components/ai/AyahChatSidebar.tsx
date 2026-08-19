"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, BookOpen, Layers, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, ChevronDown, Copy, Bookmark, BookmarkCheck } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import { saveScholarAnswer } from "@/lib/readerStorage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { amiri } from "@/app/fonts";
import Link from "next/link";
import { toast } from "sonner";
import { useVisualViewportOffset } from "@/hooks/useVisualViewport";

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

interface AyahChatSidebarProps {
  surahNumber: number;
  ayahNumber: number;
  isOpen: boolean;
  onClose: () => void;
  initialModeId?: string;
  rootWord?: string;
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

export default function AyahChatSidebar({ surahNumber, ayahNumber, isOpen, onClose, initialModeId, rootWord }: AyahChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState(initialModeId || "default");
  const [scopeChoice, setScopeChoice] = useState<'verse' | 'general' | null>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  useVisualViewportOffset();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setTimeout(() => {
        setIsContentReady(true);
      }, 150);
    } else {
      setIsContentReady(false);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);
  
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);

  const currentModeInfo = RAG_MODES.find(m => m.id === selectedModeId) || RAG_MODES[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const prevContextRef = useRef<{ surah?: number, ayah?: number, rootWord?: string, mode?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const mediaQuery = window.matchMedia("(max-width: 1279px)");
      const originalStyle = window.getComputedStyle(document.body).overflow;

      const updateScrollLock = () => {
        if (mediaQuery.matches) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = originalStyle === "hidden" ? "unset" : originalStyle;
        }
      };

      updateScrollLock();

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", updateScrollLock);
      } else {
        mediaQuery.addListener(updateScrollLock);
      }

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

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", updateScrollLock);
        } else {
          mediaQuery.removeListener(updateScrollLock);
        }
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialModeId && selectedModeId !== initialModeId && prevContextRef.current?.mode !== initialModeId) {
        setSelectedModeId(initialModeId);
      }
      
      const isSameContext = prevContextRef.current?.surah === surahNumber && 
                            prevContextRef.current?.ayah === ayahNumber && 
                            prevContextRef.current?.rootWord === rootWord;

      if (!isSameContext) {
        setScopeChoice(null);
        setMessages([]);
        prevContextRef.current = { surah: surahNumber, ayah: ayahNumber, rootWord: rootWord, mode: initialModeId };
      }
    }
  }, [isOpen, surahNumber, ayahNumber, selectedModeId, initialModeId, rootWord, currentModeInfo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    const userMessage: Message = { role: "user", content: userText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const activeScope = scopeChoice || 'verse';
    if (scopeChoice === null) {
      setScopeChoice('verse');
    }

    try {
      let reqBody: any = { message: userText, mode: selectedModeId };

      if (activeScope === 'verse') {
        if (rootWord) {
          const contextPrefix = `[System Context: The user is currently exploring the root word "${rootWord}" in Lexicon mode. They are asking a question about this specific root.]`;
          reqBody.message = `${contextPrefix}\n\nUser Question: ${userText}`;
        } else {
          const contextPrefix = `[System Context: The user is currently viewing Surah ${surahNumber}, Ayah ${ayahNumber}. They are asking a question specifically about Surah ${surahNumber}, Ayah ${ayahNumber}. You must focus solely on this verse and its classical commentaries.]`;
          reqBody.message = `${contextPrefix}\n\nUser Question: ${userText}`;
          reqBody.targetSurah = surahNumber;
          reqBody.targetAyah = ayahNumber;
        }
      } else {
        // General whole Quran / Lexicon mode
        reqBody.message = userText;
      }

      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
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
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream available.");

      const decoder = new TextDecoder("utf-8");
      let done = false;
      let assistantMessage: Message = { role: "assistant", content: "", sources: [] };
      
      setMessages((prev) => [...prev, assistantMessage]);

      let lastUpdateTime = Date.now();
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
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
    } catch (e: any) {
      toast.error(e.message);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error retrieving texts. Please try again." }]);
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

  useEffect(() => {
    if (isOpen) {
      const handleResize = () => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("resize", handleResize);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay — solid dark background with green ambient glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950 z-[100] lg:hidden overflow-hidden"
          >
            {/* Subtle green ambient glow behind container */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-emerald-500/15 blur-[120px] pointer-events-none" />
          </motion.div>
          
          {/* Sidebar / Bottom Sheet Container */}
          <motion.div
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed z-[101] lg:z-50 bg-zinc-950 flex flex-col items-start shadow-2xl overflow-visible transition-all duration-300 ease-out",
              "top-0 right-0 h-dvh max-h-dvh w-full sm:w-96 lg:w-[420px] xl:w-[450px]", // Desktop right sidebar
              "max-lg:bottom-0 max-lg:top-auto max-lg:h-[85dvh] max-lg:rounded-t-3xl max-lg:border-t max-lg:border-emerald-500/30 max-lg:shadow-[0_-20px_50px_-10px_rgba(16,185,129,0.15)]", // Mobile bottom sheet container vibe
              "lg:border-l border-emerald-500/20 lg:shadow-[-20px_0_50px_-10px_rgba(16,185,129,0.15)]"
            )}
          >
            {/* Decorative edge line for desktop */}
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-emerald-500/40 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.5)] z-50 pointer-events-none" />

            {/* Decorative top edge line for mobile */}
            <div className="lg:hidden absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)] z-50 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-emerald-500/20 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 rounded-t-3xl lg:rounded-none w-full shadow-lg relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-emerald-500/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                <div className="p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 shrink-0">
                  <Bot size={20} className="text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-emerald-400 leading-tight">
                      {rootWord ? "Lexicon Scholar AI" : surahNumber > 0 ? "Quran & Tafsir Scholar AI" : "Tafsir Scholar AI"}
                    </h3>
                    {remainingTokens !== null && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400 shrink-0">
                        <Sparkles className="size-2.5" />
                        {remainingTokens.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <div className="relative inline-flex items-center bg-emerald-950/20 border border-emerald-500/40 rounded-md hover:bg-emerald-900/40 transition-colors cursor-pointer">
                      <span className="text-[11px] text-emerald-400 font-medium py-1 pl-2 pr-6 truncate pointer-events-none">
                        {RAG_MODES.find(m => m.id === selectedModeId)?.shortName || "Select Mode"}
                      </span>
                      <select 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={selectedModeId}
                        onChange={(e) => setSelectedModeId(e.target.value)}
                      >
                        {RAG_MODES.map(m => (
                          <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-300">{m.shortName}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 text-emerald-400 pointer-events-none" />
                    </div>

                    {scopeChoice !== null && (
                      <button
                        onClick={() => {
                          const newScope = scopeChoice === 'verse' ? 'general' : 'verse';
                          setScopeChoice(newScope);
                          if (newScope === 'verse') {
                            if (rootWord) {
                              setMessages(prev => [
                                ...prev,
                                {
                                  role: "assistant",
                                  content: `I see you are exploring the root word **${rootWord}**. How can I help you with this root?`
                                }
                              ]);
                            } else {
                              setMessages(prev => [
                                ...prev,
                                {
                                  role: "assistant",
                                  content: `I see you are reading **Surah ${surahNumber}, Ayah ${ayahNumber}**. How can I help you?`
                                }
                              ]);
                            }
                          } else {
                            setMessages(prev => [
                              ...prev,
                              {
                                role: "assistant",
                                content: `As-salamu alaykum! Operating in **${currentModeInfo.name}** across the ${rootWord ? "whole Lexicon & Quran" : "whole Quran"}.\n\nSearching strictly within:\n${currentModeInfo.sources.map(s => `- *${s}*`).join("\n")}\n\nAsk me your inquiry below!`
                              }
                            ]);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50"
                        title={rootWord ? "Click to toggle between this root and whole lexicon" : "Click to toggle between this verse and whole Quran"}
                      >
                        {scopeChoice === 'verse' ? (
                          <>
                            <BookOpen className="size-3 text-emerald-400" />
                            <span>{rootWord ? `Root [${rootWord}]` : `Surah ${surahNumber}:${ayahNumber}`}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-emerald-400" />
                            <span>{rootWord ? "Whole Lexicon" : "Whole Quran"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white shrink-0 ml-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning banner */}
            {currentModeInfo.warning && (
              <div className="w-full shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 text-[10px] sm:text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                <span className="line-clamp-2"><strong>Guardrail:</strong> {currentModeInfo.warning}</span>
              </div>
            )}

            {isContentReady ? (
              <>
                {/* Chat Area */}
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y w-full p-3 sm:p-4 space-y-4 sm:space-y-6 custom-scrollbar"
                >
                  {/* Scope Selection Card for Lexicon, Quran & Tafsir Sidebars */}
                  {scopeChoice === null && messages.length === 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="size-4 text-emerald-400" />
                        <span>Select Inquiring Scope</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        For best results, please choose from these 2 options:
                      </p>
                      <div className="flex flex-col gap-2.5 pt-1">
                        <button
                          onClick={() => {
                            setScopeChoice('verse');
                            setMessages([
                              {
                                role: "assistant",
                                content: rootWord 
                                  ? `I see you are exploring the root word **${rootWord}**. How can I help you with this root?`
                                  : `I see you are reading **Surah ${surahNumber}, Ayah ${ayahNumber}**. How can I help you?`
                              }
                            ]);
                          }}
                          className="w-full text-left p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/50 hover:border-emerald-400 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                            <BookOpen className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                                {rootWord 
                                  ? `Ask about Root Word [${rootWord}]` 
                                  : `Ask about this Verse (Surah ${surahNumber}:${ayahNumber})`}
                              </span>
                              <span className="text-[10px] uppercase font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Targeted
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {rootWord 
                                ? `Focus lexical definitions, nuances, and gems specifically on root [${rootWord}].`
                                : `Focus insights, classical tafsir, and gems specifically on Surah ${surahNumber}, Ayah ${ayahNumber}.`}
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setScopeChoice('general');
                            setMessages([
                              {
                                role: "assistant",
                                content: `As-salamu alaykum! I am **Sheikh Juthur**, operating in **${currentModeInfo.name}** across the ${rootWord ? "whole Lexicon & Quran" : "whole Quran"}.\n\nSearching strictly within:\n${currentModeInfo.sources.map(s => `- *${s}*`).join("\n")}\n\nAsk me your inquiry below!`
                              }
                            ]);
                          }}
                          className="w-full text-left p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-500 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 group-hover:scale-105 transition-transform">
                            <Sparkles className="size-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                                {rootWord 
                                  ? "General Question from Whole Lexicon & Quran" 
                                  : "General Question from the Whole Quran"}
                              </span>
                              <span className="text-[10px] uppercase font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                                {rootWord ? "Whole Lexicon" : "Whole Quran"}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {rootWord 
                                ? "Explore broad linguistic principles, cross-root relationships, and classical works."
                                : "Retrieve concepts, themes, and cross-surah connections across all classical texts."}
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-2.5 sm:gap-3",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                    msg.role === "user" 
                      ? "bg-zinc-800 border-zinc-700 text-zinc-300" 
                      : msg.isScopeInvalid
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                      : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  )}>
                    {msg.role === "user" ? <User size={14} /> : msg.isScopeInvalid ? <ShieldAlert size={14} /> : <Bot size={14} />}
                  </div>

                  {/* Message Content */}
                  <div className={cn(
                    "max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-sm relative group",
                    msg.role === "user" 
                      ? "bg-zinc-800/90 border border-zinc-700/60 rounded-tr-sm text-zinc-200" 
                      : msg.isScopeInvalid
                      ? "bg-amber-950/30 border border-amber-500/40 rounded-tl-sm text-amber-100"
                      : "bg-zinc-900/90 border border-zinc-800 rounded-tl-sm text-zinc-200"
                  )}>
                    {msg.role === "assistant" && idx > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                        <button
                          onClick={() => {
                            const previousUserMsg = messages.slice(0, idx).reverse().find(m => m.role === "user");
                            const questionText = previousUserMsg?.content || (rootWord ? `Root [${rootWord}] Query` : `Surah ${surahNumber}:${ayahNumber} Inquiry`);
                            saveScholarAnswer({
                              id: `scholar_${Date.now()}_${idx}`,
                              question: questionText,
                              answer: msg.content,
                              modeName: currentModeInfo.name,
                              surahNumber: surahNumber > 0 ? surahNumber : undefined,
                              ayahNumber: ayahNumber > 0 ? ayahNumber : undefined,
                              rootWord: rootWord || undefined,
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
                          title="Copy to clipboard"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <button
                        onClick={() => copyToClipboard(msg.content, "Message copied to clipboard!")}
                        className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                    {msg.isScopeInvalid && (
                      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-amber-500/30 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                        <ShieldAlert className="size-3.5" />
                        <span>Scope Guardrail</span>
                      </div>
                    )}

                    <div className="prose prose-invert prose-emerald max-w-none text-xs sm:text-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-base font-bold text-zinc-100 mt-3 mb-2 border-b border-zinc-800 pb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-sm font-bold text-zinc-100 mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-zinc-200 mt-2 mb-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-zinc-100" {...props} />,
                          p: ({node, children, ...props}) => {
                            const textStr = React.Children.toArray(children).join('');
                            const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                            const isPredominantlyArabic = arabicMatches.length > 10 && (arabicMatches.length / textStr.length > 0.35);
                            
                            const containerClasses = "quran-block my-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-3 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                            if (isPredominantlyArabic) {
                              return (
                                <div className={containerClasses}>
                                  <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                                  <p className={`m-0 font-arabic text-base md:text-lg text-emerald-200 leading-loose text-right dir-rtl`}>
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
                                  <p className="m-0 italic text-[13px] sm:text-sm text-zinc-200">
                                    {children}
                                  </p>
                                </div>
                              );
                            }

                            return <p className="mb-2 [&:last-child]:mb-0" {...props}>{renderInlineBadges(children)}</p>;
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
                            const containerClasses = "quran-block my-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-3 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                            return (
                              <div className={containerClasses}>
                                <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                                <blockquote className={`m-0 border-none p-0 text-zinc-200 ${isPredominantlyArabic ? `${amiri.className} text-base md:text-lg leading-loose text-right text-emerald-200` : 'italic text-[13px] sm:text-sm text-zinc-200'}`}>
                                  {renderInlineBadges(children)}
                                </blockquote>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources Section */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="size-3 text-emerald-500 shrink-0" />
                            <span className="truncate">Sources Used ({msg.sources.length}):</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.sources.map((src, i) => (
                            <Link
                              key={i}
                              href={
                                src.workType === "lexicon"
                                  ? `/lexicon?root=${src.rootWord || "رحم"}&author=${encodeURIComponent(src.authorName || src.book)}`
                                  : `/tafsir?surah=${src.surah || 1}&ayah=${src.ayah || 1}&author=${encodeURIComponent(src.authorName || src.book)}`
                              }
                              className="group p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1 truncate">
                                  {src.workType === "lexicon" ? <Layers className="size-2.5 text-rose-400 shrink-0" /> : <BookOpen className="size-2.5 text-emerald-400 shrink-0" />}
                                  <span className="truncate">{src.book}</span>
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 line-clamp-2 leading-snug">
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
                <div className="flex gap-2.5 sm:gap-3 mr-auto">
                  <div className="size-7 sm:size-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <Bot className="size-3.5 sm:size-4 text-emerald-400" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                    <Loader2 className="size-3.5 sm:size-4 animate-spin text-emerald-500" />
                    <span className="text-xs text-zinc-400">Searching classical texts...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div 
              className="relative z-10 shrink-0 bg-zinc-950 border-t border-zinc-800/80 p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),8px)] w-full after:content-[''] after:absolute after:top-full after:left-0 after:right-0 after:h-[100vh] after:bg-zinc-950 pointer-events-auto"
            >
              <div className="relative flex items-center">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask in ${currentModeInfo.shortName}...`}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl py-3 pl-3.5 pr-12 text-[16px] sm:text-[14px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors resize-none min-h-[48px] max-h-[120px] custom-scrollbar"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2.5 bottom-2.5 size-7 sm:size-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-sm"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
              </>
            ) : (
              <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] gap-3">
                <Loader2 className="size-8 animate-spin text-emerald-500/50" />
                <span className="text-xs text-zinc-500 font-medium">Loading Scholar AI...</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
