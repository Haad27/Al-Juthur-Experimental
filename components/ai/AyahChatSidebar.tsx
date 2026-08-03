"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, BookOpen, Layers, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAG_MODES, RagModeInfo } from "@/lib/ai/rag/modes-config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { amiri } from "@/app/fonts";
import Link from "next/link";
import { toast } from "sonner";

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
          (part.includes('Tafsir') || part.includes('Surah') || part.includes('Adwa') || part.includes('Kathir') || part.includes('Tabari') || part.includes('Qurtubi') || part.includes('Wasit') || part.includes('Root:') || part.match(/\[\d+:\d+\]/))
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

export default function AyahChatSidebar({ surahNumber, ayahNumber, isOpen, onClose }: AyahChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState("default");
  
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number>(250000);

  const currentModeInfo = RAG_MODES.find(m => m.id === selectedModeId) || RAG_MODES[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/rag')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRemainingTokens(data.remaining);
            if (data.limit) setTokenLimit(data.limit);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && surahNumber && ayahNumber) {
      setMessages([
        { 
          role: "assistant", 
          content: `As-salamu alaykum! I am **Sheikh Juthur**. Switched to **${currentModeInfo.name}**.\n\nSearching strictly within:\n${currentModeInfo.sources.map(s => `- *${s}*`).join("\n")}\n\nI see you are reading **Surah ${surahNumber}, Ayah ${ayahNumber}**. How can I help you?` 
        }
      ]);
    }
  }, [isOpen, surahNumber, ayahNumber, selectedModeId]);

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

    try {
      // Inject the selected verse context explicitly so the RAG knows what the user is talking about
      const enrichedQuery = `[System Context: The user is currently viewing Surah ${surahNumber}, Ayah ${ayahNumber}. They are asking a question about this specific verse.]\n\nUser Question: ${userText}`;

      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: enrichedQuery, mode: selectedModeId })
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] xl:hidden backdrop-blur-sm"
          />
          
          {/* Sidebar / Bottom Sheet */}
          <motion.div
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed z-[101] xl:z-50 bg-zinc-950/95 xl:bg-zinc-900/95 backdrop-blur-md border-l border-emerald-500/20 shadow-2xl flex flex-col items-start",
              "top-0 right-0 h-screen w-full sm:w-96 xl:w-[450px]", // Desktop right sidebar
              "max-xl:bottom-0 max-xl:top-auto max-xl:h-[85vh] max-xl:rounded-t-3xl max-xl:border-t" // Mobile bottom sheet
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-emerald-500/20 bg-zinc-900/80 rounded-t-3xl xl:rounded-none w-full shadow-sm relative">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 shrink-0">
                  <Bot size={20} className="text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-emerald-400 leading-tight">Tafsir Scholar AI</h3>
                    {remainingTokens !== null && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400 shrink-0">
                        <Sparkles className="size-2.5" />
                        {remainingTokens.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="relative inline-flex items-center bg-emerald-950/20 border border-emerald-500/40 rounded-md hover:bg-emerald-900/40 transition-colors mt-1">
                    <select 
                      className="appearance-none bg-transparent text-[11px] text-emerald-400 outline-none cursor-pointer py-1 pl-2 pr-6 w-auto truncate font-medium"
                      value={selectedModeId}
                      onChange={(e) => setSelectedModeId(e.target.value)}
                    >
                      {RAG_MODES.map(m => (
                        <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-300">{m.shortName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 text-emerald-400 pointer-events-none" />
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

            {/* Chat Area */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto w-full p-3 sm:p-4 space-y-4 sm:space-y-6 custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-2.5 sm:gap-3",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-0.5",
                    msg.role === "user" 
                      ? "bg-zinc-800 border border-zinc-700 text-zinc-300" 
                      : msg.isScopeInvalid
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                      : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  )}>
                    {msg.role === "user" ? <User size={14} /> : msg.isScopeInvalid ? <ShieldAlert size={14} /> : <Bot size={14} />}
                  </div>

                  <div className={cn(
                    "max-w-[88%] sm:max-w-[90%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm text-sm",
                    msg.role === "user" 
                      ? "bg-zinc-800/90 border border-zinc-700/60 rounded-tr-sm text-zinc-200" 
                      : msg.isScopeInvalid
                      ? "bg-amber-950/30 border border-amber-500/40 rounded-tl-sm text-amber-100"
                      : "bg-zinc-900/80 border border-zinc-800/90 rounded-tl-sm text-zinc-200"
                  )}>
                    {msg.isScopeInvalid && (
                      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                        <ShieldAlert className="size-3" />
                        <span>Scope Guardrail Triggered</span>
                      </div>
                    )}
                    
                    <div className="prose prose-invert prose-emerald max-w-none text-[13px] sm:text-sm leading-relaxed prose-p:leading-relaxed prose-headings:mt-3 prose-headings:mb-2 prose-h1:text-base prose-h2:text-[15px] prose-p:mb-2 prose-blockquote:my-2 prose-li:mb-0.5">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({node, ...props}) => <strong className="font-semibold text-zinc-100" {...props} />,
                          p: ({node, children, ...props}) => {
                            const textStr = React.Children.toArray(children).join('');
                            const arabicMatches = textStr.match(/[\u0600-\u06FF]/g) || [];
                            const isPredominantlyArabic = arabicMatches.length > 5 && (arabicMatches.length / textStr.length > 0.25);
                            
                            if (isPredominantlyArabic) {
                              return (
                                <div className="my-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                                  <p className={`m-0 ${amiri.className} text-base md:text-lg text-emerald-200 leading-loose text-right dir-rtl`}>
                                    {children}
                                  </p>
                                </div>
                              );
                            }

                            const isInlineVerseQuote = /\[Surah \d+:\d+\]|\[Surah [^\]]+\]/i.test(textStr) && textStr.includes('"');
                            if (isInlineVerseQuote && textStr.length < 350 && !textStr.toLowerCase().includes('tafsir')) {
                              return (
                                <div className="my-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                                  <p className="m-0 italic text-[13px] sm:text-sm text-zinc-200">
                                    {children}
                                  </p>
                                </div>
                              );
                            }

                            return <p className="mb-2" {...props}>{renderInlineBadges(children)}</p>;
                          },
                          blockquote: ({node, children}) => {
                            let textStr = '';
                            React.Children.forEach(children, c => {
                              if (typeof c === 'string') textStr += c;
                              else if (React.isValidElement(c) && (c as any).props?.children) {
                                textStr += React.Children.toArray((c as any).props.children).join('');
                              }
                            });
                            const hasArabic = /[\u0600-\u06FF]/.test(textStr);

                            return (
                              <div className="my-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/80" />
                                <blockquote className={`m-0 border-none p-0 text-zinc-200 ${hasArabic ? `${amiri.className} text-base md:text-lg leading-loose text-right text-emerald-200` : 'italic text-[13px] sm:text-sm text-zinc-200'}`}>
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
            <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800/80 mb-[env(safe-area-inset-bottom)] w-full shrink-0">
              <div className="relative flex items-center">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask in ${currentModeInfo.shortName}...`}
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl py-3 pl-3.5 pr-12 text-[15px] sm:text-[14px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors resize-none min-h-[48px] max-h-[120px] custom-scrollbar"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
