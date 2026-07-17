"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles, AlertCircle, Loader2, Bot, User } from "lucide-react";
import { amiri, inter } from "@/app/fonts";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function RagPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "As-salamu alaykum! I am the Al-Juthur Theological AI. Ask me any question regarding the Quran, Tafsir, or classical Arabic linguistics." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingReqs, setRemainingReqs] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate response.");
      }

      setRemainingReqs(data.remaining);
      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (err: any) {
      toast.error(err.message);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again later." }]);
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
    <div className={`min-h-screen flex flex-col bg-zinc-950 text-white ${inter.className}`}>
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-sm font-medium transition-all text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              <span>Back Home</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800 hidden md:block mx-2" />
            <h1 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-500" />
              <span>Theological RAG Engine</span>
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <AlertCircle className="size-3.5 text-zinc-400" />
            <span className="text-zinc-400">
              {remainingReqs !== null ? `${remainingReqs} Free Requests Left` : "OpenRouter API"}
            </span>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-[900px] mx-auto space-y-6 pb-20">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 size-10 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-zinc-800 border border-zinc-700" : "bg-emerald-500/20 border border-emerald-500/40"}`}>
                {msg.role === "user" ? <User className="size-5 text-zinc-300" /> : <Bot className="size-5 text-emerald-400" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 ${msg.role === "user" ? "bg-zinc-800/80 border border-zinc-700/50 rounded-tr-sm" : "bg-zinc-900/50 border border-zinc-800/80 rounded-tl-sm"}`}>
                <div className="prose prose-invert prose-emerald max-w-none text-sm md:text-base leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="shrink-0 size-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="size-5 text-emerald-400" />
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl rounded-tl-sm px-6 py-5 flex items-center gap-3">
                <Loader2 className="size-4 animate-spin text-emerald-500" />
                <span className="text-sm text-zinc-400">Searching classical texts...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800/80 p-4">
        <div className="max-w-[900px] mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a theological or contextual question..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-14 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none min-h-[60px] max-h-[200px] custom-scrollbar"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 size-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="text-center mt-3">
          <p className="text-[11px] text-zinc-600 font-medium">
            AI can make mistakes. Verify critical theological rulings with certified scholars. 
            <span className="ml-1 text-emerald-500/70">Powered by OpenRouter API.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
