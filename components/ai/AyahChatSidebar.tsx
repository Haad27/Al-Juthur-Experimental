"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAG_MODES } from "@/lib/ai/rag/modes-config";

interface AyahChatSidebarProps {
  surahNumber: number;
  ayahNumber: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AyahChatSidebar({ surahNumber, ayahNumber, isOpen, onClose }: AyahChatSidebarProps) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState("default");
  
  useEffect(() => {
    if (isOpen && surahNumber && ayahNumber) {
      const mode = RAG_MODES.find(m => m.id === selectedModeId);
      
      let initialText = `Assalamu alaikum! I am currently in **${mode?.shortName || "Default Mode"}**, viewing **Surah ${surahNumber}, Ayah ${ayahNumber}**. `;
      if (selectedModeId === "default") {
        initialText += "I am trained on foundational Tafsirs like Ibn Kathir, al-Tabari, al-Qurtubi, and others. ";
      } else {
        initialText += `I am trained on sources like ${mode?.sources.slice(0, 2).join(", ")}. `;
      }
      initialText += "What would you like to ask?";

      setMessages([
        { role: "ai", text: initialText }
      ]);
    }
  }, [isOpen, surahNumber, ayahNumber, selectedModeId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      // Basic implementation for now - this should ideally route to your RAG backend
      // with context about the surah and ayah.
      const response = await fetch("/api/ai/scholar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMsg, 
          context: { surah: surahNumber, ayah: ayahNumber } 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: "ai", text: data.text || data.answer || "Sorry, I couldn't process that." }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: "I encountered an error connecting to the scholar engine." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
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
            className="fixed inset-0 bg-black/60 z-[100] lg:hidden backdrop-blur-sm"
          />
          
          {/* Sidebar / Bottom Sheet */}
          <motion.div
            initial={{ x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: "100%", y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed lg:sticky lg:top-0 z-[101] lg:z-10 bg-zinc-950/95 lg:bg-zinc-900/50 backdrop-blur-md border-l border-emerald-500/20 shadow-2xl flex flex-col items-start",
              "right-0 h-screen w-full sm:w-96 lg:w-[380px] xl:w-[420px]", // Desktop right sidebar
              "max-lg:bottom-0 max-lg:top-auto max-lg:h-[85vh] max-lg:rounded-t-3xl max-lg:border-t" // Mobile bottom sheet
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-emerald-500/20 bg-zinc-900/80 rounded-t-3xl lg:rounded-none w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 shrink-0">
                  <Bot size={20} className="text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-semibold text-emerald-400 leading-tight">Tafsir Scholar AI</h3>
                  <select 
                    className="bg-transparent text-xs text-zinc-400 border-none outline-none cursor-pointer mt-0.5 truncate pr-2"
                    value={selectedModeId}
                    onChange={(e) => setSelectedModeId(e.target.value)}
                  >
                    {RAG_MODES.map(m => (
                      <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-300">{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white shrink-0 ml-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "size-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-300"
                  )}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-tr-none" 
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="size-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span className="text-sm text-zinc-400">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-zinc-900/80 border-t border-emerald-500/20 mb-[env(safe-area-inset-bottom)] w-full">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Ask about ${surahNumber}:${ayahNumber}...`}
                  className="w-full bg-zinc-950 border border-emerald-500/20 rounded-full py-3 pl-4 pr-12 text-[16px] text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 rounded-full transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
