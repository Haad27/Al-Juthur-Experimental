"use client";
// lib/GlobalStateContext.tsx
import React, { createContext, useState, useContext } from "react";
import { toast } from "sonner";

// Define the shape of the global state
interface GlobalState {
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  wbwFontSize: number;
  setWbwFontSize: React.Dispatch<React.SetStateAction<number>>;
  mistakeDetection: boolean;
  setMistakeDetection: React.Dispatch<React.SetStateAction<boolean>>;
  showTranslation: boolean;
  setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  showWbw: boolean;
  setShowWbw: React.Dispatch<React.SetStateAction<boolean>>;
  translationEdition: string;
  setTranslationEdition: (edition: string) => void;
  mushafStyle: string;
  setMushafStyle: (style: string) => void;
  
  selectedReciter: number;
  setSelectedReciter: (reciter: number) => void;

  immersiveMode: boolean;
  setImmersiveMode: React.Dispatch<React.SetStateAction<boolean>>;
  
  // AI Translation Global State
  aiInputText: string;
  setAiInputText: React.Dispatch<React.SetStateAction<string>>;
  aiTranslationData: any[] | null;
  aiIsTranslating: boolean;
  aiError: string | null;
  triggerAiTranslation: (text: string) => Promise<void>;
  clearAiTranslation: () => void;
}

// Create the context with a default value
const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const useGlobalState = (): GlobalState => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};

export const GlobalStateProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [fontSize, setFontSize] = useState(3);
  const [wbwFontSize, setWbwFontSize] = useState(3);
  const [mistakeDetection, setMistakeDetection] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showWbw, setShowWbw] = useState(true);
  const [translationEdition, setTranslationEditionState] = useState(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )trans=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : "131";
    }
    return "131";
  });

  const setTranslationEdition = (edition: string) => {
    setTranslationEditionState(edition);
    if (typeof window !== "undefined") {
      document.cookie = `trans=${encodeURIComponent(edition)}; path=/; max-age=31536000`;
    }
  };

  const [mushafStyle, setMushafStyleState] = useState(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )mushaf=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : "indopak-15";
    }
    return "indopak-15";
  });


  const setMushafStyle = (style: string) => {
    setMushafStyleState(style);
    if (typeof window !== "undefined") {
      document.cookie = `mushaf=${encodeURIComponent(style)}; path=/; max-age=31536000`;
    }
  };

  const [selectedReciter, setSelectedReciterState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )reciter=([^;]*)/);
      return match ? parseInt(decodeURIComponent(match[1])) : 7;
    }
    return 7; // Mishary Alafasy as default
  });

  const setSelectedReciter = (reciter: number) => {
    setSelectedReciterState(reciter);
    if (typeof window !== "undefined") {
      document.cookie = `reciter=${reciter}; path=/; max-age=31536000`;
    }
  };

  // AI Translation State
  const [aiInputText, setAiInputText] = useState("");
  const [aiTranslationData, setAiTranslationData] = useState<any[] | null>(null);
  const [aiIsTranslating, setAiIsTranslating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

function parseMarkdownTable(text: string): Array<{ transcreatedText: string, sourceText: string }> {
  const lines = text.split('\n');
  const rows: Array<{ transcreatedText: string, sourceText: string }> = [];
  const seenRows = new Set<string>();
  
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed.includes('|')) continue;
    
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
    
    const columns = trimmed.split('|').map(p => p.trim());
    if (columns.length >= 2) {
      const transcreated = columns[0];
      const source = columns[1];
      
      if (
        transcreated.toLowerCase() === 'transcreated text' ||
        source.toLowerCase() === 'source text' ||
        transcreated.includes('---') ||
        source.includes('---')
      ) continue;
      
      if (!transcreated && !source) continue;
      
      const rowKey = `${transcreated.trim()}|||${source.trim()}`;
      if (seenRows.has(rowKey)) continue;
      seenRows.add(rowKey);
      
      rows.push({
        transcreatedText: transcreated,
        sourceText: source
      });
    }
  }
  return rows;
}

  const triggerAiTranslation = async (textToTranslate: string) => {
    if (!textToTranslate.trim()) return;
    
    setAiIsTranslating(true);
    setAiError(null);
    setAiTranslationData(null);
    setAiInputText(textToTranslate);

    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToTranslate }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error ${response.status}`);
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        setAiTranslationData(data.data);
        toast.success("AI Translation complete!");
        setAiIsTranslating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream available.");
      
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let lastParseTime = 0;
      let wasTruncated = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.finishReason === "MAX_TOKENS") {
                wasTruncated = true;
              }
              if (data.text) {
                fullText += data.text;
                
                const now = Date.now();
                if (now - lastParseTime > 200) {
                   const parsed = parseMarkdownTable(fullText);
                   if (parsed.length > 0) {
                     setAiTranslationData(parsed);
                   }
                   lastParseTime = now;
                }
              }
            } catch (e) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }
      
      const finalParsed = parseMarkdownTable(fullText);
      
      if (wasTruncated) {
        finalParsed.push({
          sourceText: "⚠️ **تنبيه:** لقد قمنا بترجمة أقصى ما يمكن. يرجى نسخ الجزء المتبقي والمحاولة مرة أخرى.",
          transcreatedText: "⚠️ **Notice:** Your text was extremely long, so the system translated as much as it could. Please copy the remaining untranslated portion and submit it again to continue."
        });
      }

      if (finalParsed.length > 0) {
        setAiTranslationData(finalParsed);
      } else {
        setAiTranslationData([{ sourceText: textToTranslate, transcreatedText: fullText }]);
      }
      toast.success("AI Translation complete!");
    } catch (err: any) {
      setAiError(err.message);
      toast.error(`AI Translation failed: ${err.message}`);
    } finally {
      setAiIsTranslating(false);
    }
  };

  const clearAiTranslation = () => {
    setAiInputText("");
    setAiTranslationData(null);
    setAiError(null);
    setAiIsTranslating(false);
  };

  return (
    <GlobalStateContext.Provider
      value={{
        fontSize,
        setFontSize,
        wbwFontSize,
        setWbwFontSize,
        mistakeDetection,
        setMistakeDetection,
        immersiveMode,
        setImmersiveMode,
        showTranslation,
        setShowTranslation,
        showWbw,
        setShowWbw,
        translationEdition,
        setTranslationEdition,
        mushafStyle,
        setMushafStyle,
        selectedReciter,
        setSelectedReciter,
        
        aiInputText,
        setAiInputText,
        aiTranslationData,
        aiIsTranslating,
        aiError,
        triggerAiTranslation,
        clearAiTranslation,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
