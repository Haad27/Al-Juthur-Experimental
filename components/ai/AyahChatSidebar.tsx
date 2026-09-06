"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, Loader2, BookOpen, Layers, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, ChevronDown, Copy, Bookmark, BookmarkCheck, Crown } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import { saveScholarAnswer } from "@/lib/readerStorage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { amiri } from "@/app/fonts";
import Link from "next/link";
import { toast } from "sonner";
import { useVisualViewportOffset } from "@/hooks/useVisualViewport";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";

import SourceChunkViewer, { SourceItem } from "@/components/ai/SourceChunkViewer";

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

  if (targetSurah && targetAyah) {
    const exact = sources.find((s) => s.surah === targetSurah && s.ayah === targetAyah);
    if (exact) return exact;
  }

  const rootMatch = sources.find(
    (s) => s.rootWord && text.includes(s.rootWord.toLowerCase())
  );
  if (rootMatch) return rootMatch;

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
              className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent hover:bg-accent/15 hover:border-accent hover:text-accent text-[11px] font-mono not-italic align-middle opacity-90 hover:opacity-100 transition-all cursor-pointer active:scale-95 group"
              title="Click to view retrieved chunk from this source"
            >
              <BookOpen className="size-2.5 text-accent group-hover:text-accent shrink-0 inline" />
              <span className="underline decoration-accent/40 underline-offset-2 group-hover:decoration-accent">
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

export default function AyahChatSidebar({ surahNumber, ayahNumber, isOpen, onClose, initialModeId, rootWord }: AyahChatSidebarProps) {
  const { tier, openPricingModal, incrementDailyQueries, dailyQueriesUsed, dailyQueriesLimit } = useSubscriptionStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState(initialModeId || "default");
  const [scopeChoice, setScopeChoice] = useState<'verse' | 'general' | null>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceItem | null>(null);
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

    /* Quota check temporarily commented out for full free mode:
    if (tier === "FREE" && dailyQueriesUsed >= dailyQueriesLimit) {
      toast.error("Daily AI Quota Reached (5/5)", {
        description: "You have used all 5 free research questions for today. Upgrade to Pro for 50 queries/day or use code ILOVEQURAN!",
        duration: 6000,
      });
      openPricingModal();
      return;
    }
    */
    
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
            className="fixed inset-0 bg-background z-[100] lg:hidden overflow-hidden"
          >
            {/* Subtle green ambient glow behind container */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-accent/10 blur-[120px] pointer-events-none" />
          </motion.div>
          
          {/* Sidebar / Bottom Sheet Container */}
          <motion.div
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed z-[101] lg:z-50 bg-background flex flex-col items-start shadow-2xl overflow-visible transition-all duration-300 ease-out",
              "top-0 right-0 h-dvh max-h-dvh w-full sm:w-96 lg:w-[420px] xl:w-[450px]", // Desktop right sidebar
              "max-lg:bottom-0 max-lg:top-auto max-lg:h-[85dvh] max-lg:rounded-t-3xl max-lg:border-t max-lg:border-accent/30 max-lg:", // Mobile bottom sheet container vibe
              "lg:border-l border-accent/20 lg:"
            )}
          >
            {/* Decorative edge line for desktop */}
            <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-accent/40 to-transparent  z-50 pointer-events-none" />

            {/* Decorative top edge line for mobile */}
            <div className="lg:hidden absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent  z-50 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-accent/20 bg-gradient-to-br from-card to-background/90 rounded-t-3xl lg:rounded-none w-full shadow-lg relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-accent/10 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
                <div className="p-2 bg-accent/10 rounded-full border border-accent/20 shrink-0">
                  <Bot size={20} className="text-accent" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-accent leading-tight">
                      {rootWord ? "Lexicon Scholar AI" : surahNumber > 0 ? "Quran & Tafsir Scholar AI" : "Tafsir Scholar AI"}
                    </h3>
                    {remainingTokens !== null && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-mono text-accent shrink-0">
                        <Sparkles className="size-2.5" />
                        {remainingTokens.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <div className="relative inline-flex items-center bg-accent/10 border border-accent/40 rounded-md hover:bg-accent/15 transition-colors cursor-pointer">
                      <span className="text-[11px] text-accent font-medium py-1 pl-2 pr-6 truncate pointer-events-none">
                        {RAG_MODES.find(m => m.id === selectedModeId)?.shortName || "Select Mode"}
                      </span>
                      <select 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={selectedModeId}
                        onChange={(e) => setSelectedModeId(e.target.value)}
                      >
                        <optgroup label="Main RAG Models">
                          {RAG_MODES.filter(m => m.isPrimary).map(m => (
                            <option key={m.id} value={m.id} className="bg-card text-foreground font-medium">{m.shortName}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Specialized Models">
                          {RAG_MODES.filter(m => !m.isPrimary).map(m => (
                            <option key={m.id} value={m.id} className="bg-card text-reading">{m.shortName}</option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 text-accent pointer-events-none" />
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
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer bg-accent/10 border-accent/30 text-accent hover:bg-accent/15"
                        title={rootWord ? "Click to toggle between this root and whole lexicon" : "Click to toggle between this verse and whole Quran"}
                      >
                        {scopeChoice === 'verse' ? (
                          <>
                            <BookOpen className="size-3 text-accent" />
                            <span>{rootWord ? `Root [${rootWord}]` : `Surah ${surahNumber}:${ayahNumber}`}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-accent" />
                            <span>{rootWord ? "Whole Lexicon" : "Whole Quran"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* <button
                  onClick={openPricingModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 hover:bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                  title="View Research Plans & AI Quota"
                >
                  <Crown className="size-3 text-accent" />
                  <span className="uppercase">{tier}</span>
                </button> */}
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Warning banner */}
            {currentModeInfo.warning && (
              <div className="w-full shrink-0 bg-accent/10 border-b border-accent/25 px-3 py-1.5 text-[10px] sm:text-xs text-reading flex items-center gap-2">
                <AlertTriangle className="size-3.5 text-accent shrink-0" />
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
                    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-accent/40 shadow-xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="size-4 text-accent" />
                        <span>Select Inquiring Scope</span>
                      </div>
                      <p className="text-xs text-reading leading-relaxed">
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
                          className="w-full text-left p-3.5 rounded-xl bg-accent/10 hover:bg-accent/15 border border-accent/40 hover:border-accent transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0 group-hover:scale-105 transition-transform">
                            <BookOpen className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-accent group-hover:text-arabic">
                                {rootWord 
                                  ? `Ask about Root Word [${rootWord}]` 
                                  : `Ask about this Verse (Surah ${surahNumber}:${ayahNumber})`}
                              </span>
                              <span className="text-[10px] uppercase font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/30">
                                Targeted
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
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
                          className="w-full text-left p-3.5 rounded-xl bg-card/70 hover:bg-muted border border-border hover:border-border transition-all flex items-start gap-3 group cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-muted text-reading shrink-0 group-hover:scale-105 transition-transform">
                            <Sparkles className="size-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground group-hover:text-foreground">
                                {rootWord 
                                  ? "General Question from Whole Lexicon & Quran" 
                                  : "General Question from the Whole Quran"}
                              </span>
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                {rootWord ? "Whole Lexicon" : "Whole Quran"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
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
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {/* Message Content */}
                  <div className={cn(
                    "rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-sm relative group",
                    msg.role === "user" 
                      ? "max-w-[88%] sm:max-w-[85%] bg-muted border border-border text-foreground pr-8" 
                      : msg.isScopeInvalid
                      ? "w-full bg-accent/10 border border-accent/30 text-reading"
                      : "w-full bg-card border border-border text-foreground"
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
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted transition cursor-pointer"
                          title="Save Answer to Profile"
                        >
                          <Bookmark className="size-3.5" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(msg.content, "Response copied to clipboard!")}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted transition cursor-pointer"
                          title="Copy to clipboard"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <button
                        onClick={() => copyToClipboard(msg.content, "Message copied to clipboard!")}
                        className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-muted transition opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                    {msg.isScopeInvalid && (
                      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-accent/25 text-[11px] font-bold text-accent uppercase tracking-wider">
                        <ShieldAlert className="size-3.5" />
                        <span>Scope Guardrail</span>
                      </div>
                    )}

                    <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-base font-bold text-foreground mt-3 mb-2 border-b border-border pb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-sm font-bold text-foreground mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-foreground mt-2 mb-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                          p: ({node, children, ...props}) => {
                            const textStr = React.Children.toArray(children).join('');
                            const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                            const isPredominantlyArabic = arabicMatches.length > 10 && (arabicMatches.length / textStr.length > 0.35);
                            
                            const containerClasses = "quran-block my-2 p-3 rounded-lg bg-accent/10 border border-accent/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-3 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                            if (isPredominantlyArabic) {
                              const isUrdu = /[\u067E\u0686\u0698\u06AF\u0679\u0688\u0691\u06BA\u06D2\u06C1]/.test(textStr) || /\b(اور|ہیں|تھا|تھی|تھے|کے|کی|کو|سے|نے|میں|پر|کا|یہ|وہ|ایک)\b/.test(textStr);
                              return (
                                <div className={containerClasses}>
                                  <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-accent/80" />
                                  <p className={`m-0 ${isUrdu ? 'font-urdu' : 'font-arabic'} text-base md:text-lg text-arabic leading-loose text-right dir-rtl`}>
                                    {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
                                  </p>
                                </div>
                              );
                            }

                            const isInlineVerseQuote = /\[Surah \d+:\d+\]|\[Surah [^\]]+\]/i.test(textStr) && textStr.includes('"');
                            if (isInlineVerseQuote && textStr.length < 350 && !textStr.toLowerCase().includes('tafsir')) {
                              return (
                                <div className={containerClasses}>
                                  <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-accent/80" />
                                  <p className="m-0 italic text-[13px] sm:text-sm text-foreground">
                                    {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
                                  </p>
                                </div>
                              );
                            }

                            return <p className="mb-2 [&:last-child]:mb-0" {...props}>{renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}</p>;
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
                            const containerClasses = "quran-block my-2 p-3 rounded-lg bg-accent/10 border border-accent/30 shadow-sm relative overflow-hidden [&_.quran-block]:!p-0 [&_.quran-block]:!m-0 [&_.quran-block:not(:first-child)]:!mt-3 [&_.quran-block]:!border-none [&_.quran-block]:!bg-transparent [&_.quran-block]:!shadow-none [&_.quran-block>.quran-bar]:!hidden";

                            return (
                              <div className={containerClasses}>
                                <div className="quran-bar absolute top-0 left-0 w-1 h-full bg-accent/80" />
                                <blockquote className={`m-0 border-none p-0 text-foreground ${isPredominantlyArabic ? `${amiri.className} text-base md:text-lg leading-loose text-right text-arabic` : 'italic text-[13px] sm:text-sm text-foreground'}`}>
                                  {renderInlineBadges(children, msg.sources, (s) => setActiveSource(s))}
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
                      <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-border space-y-2">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="size-3 text-accent shrink-0" />
                            <span className="truncate">Sources Used ({msg.sources.length}):</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {msg.sources.map((src, i) => (
                            <Link
                              key={i}
                              href={
                                src.workType === "lexicon"
                                  ? `/lexicon?root=${encodeURIComponent(src.rootWord || "رحم")}&author=${encodeURIComponent(src.authorName || src.book)}`
                                  : `/tafsir?surah=${src.surah || 1}&ayah=${src.ayah || 1}&author=${encodeURIComponent(src.authorName || src.book)}`
                              }
                              target="_blank"
                              className="group p-2 rounded-lg bg-background/80 border border-border hover:border-accent/40 transition-all text-left space-y-0.5 block"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors flex items-center gap-1 truncate">
                                  {src.workType === "lexicon" ? <Layers className="size-2.5 text-rose-400 shrink-0" /> : <BookOpen className="size-2.5 text-accent shrink-0" />}
                                  <span className="truncate">{src.book}</span>
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground group-hover:text-muted-foreground line-clamp-2 leading-snug">
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
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-card border border-border flex items-center gap-2 shadow-sm">
                    <Loader2 className="size-3.5 sm:size-4 animate-spin text-accent shrink-0" />
                    <span className="text-xs text-muted-foreground">Searching classical texts...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div 
              className="relative z-10 shrink-0 bg-background border-t border-border p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),8px)] w-full after:content-[''] after:absolute after:top-full after:left-0 after:right-0 after:h-[100vh] after:bg-background pointer-events-auto"
            >
              <div className="relative flex items-center">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask in ${currentModeInfo.shortName}...`}
                  className="w-full bg-card border border-border rounded-2xl py-3 pl-3.5 pr-12 text-[16px] sm:text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-accent/50 transition-colors resize-none min-h-[48px] max-h-[120px] custom-scrollbar"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2.5 bottom-2.5 size-7 sm:size-8 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground text-foreground flex items-center justify-center transition-all shadow-sm"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
              </>
            ) : (
              <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] gap-3">
                <Loader2 className="size-8 animate-spin text-accent" />
                <span className="text-xs text-muted-foreground font-medium">Loading Scholar AI...</span>
              </div>
            )}

            {/* Source Chunk Viewer Overlay Drawer */}
            {activeSource && (
              <div className="absolute inset-0 z-50 flex flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-200">
                <SourceChunkViewer
                  source={activeSource}
                  onClose={() => setActiveSource(null)}
                  isMobile={true}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
