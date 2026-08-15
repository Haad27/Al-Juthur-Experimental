"use client";
// lib/GlobalStateContext.tsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { toast } from "sonner";
import { fragmentArabicText } from "../utils";

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
  aiUntranslatedText: string | null;
  setAiUntranslatedText: React.Dispatch<React.SetStateAction<string | null>>;
  aiError: string | null;
  triggerAiTranslation: (text: string, append?: boolean) => Promise<void>;
  clearAiTranslation: () => void;
  
  isWordDialogVisible: boolean;
  setIsWordDialogVisible: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [fontSize, _setFontSize] = useState(3);
  const [wbwFontSize, _setWbwFontSize] = useState(3);

  const setFontSize: React.Dispatch<React.SetStateAction<number>> = (value) => {
    _setFontSize((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== "undefined") localStorage.setItem("quran_fontSize", nextValue.toString());
      return nextValue;
    });
  };

  const setWbwFontSize: React.Dispatch<React.SetStateAction<number>> = (value) => {
    _setWbwFontSize((prev) => {
      const nextValue = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== "undefined") localStorage.setItem("quran_wbwFontSize", nextValue.toString());
      return nextValue;
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFontSize = localStorage.getItem("quran_fontSize");
      if (savedFontSize) {
        _setFontSize(parseInt(savedFontSize, 10));
      }

      const savedWbwFontSize = localStorage.getItem("quran_wbwFontSize");
      if (savedWbwFontSize) {
        _setWbwFontSize(parseInt(savedWbwFontSize, 10));
      }
    }
  }, []);
  const [mistakeDetection, setMistakeDetection] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showWbw, setShowWbw] = useState(true);
  const [translationEdition, setTranslationEditionState] = useState(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )trans=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : "203";
    }
    return "203";
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
      return match ? decodeURIComponent(match[1]) : "v2";
    }
    return "v2";
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
  const [aiUntranslatedText, setAiUntranslatedText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isWordDialogVisible, setIsWordDialogVisible] = useState(false);

function parseMarkdownTable(text: string, originalFragments?: {text: string, delimiter: string}[], isFinal: boolean = false): Array<{ transcreatedText: string, sourceText: string }> {
  const lines = text.split('\n');
  const rows: Array<{ transcreatedText: string, sourceText: string, claimedIndices: number[] }> = [];
  const seenRows = new Set<string>();
  
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed.startsWith('|') && !trimmed.includes('|')) continue;
    
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
    
    const columns = trimmed.split('|').map(p => p.trim());
    if (columns.length >= 1) {
      let transcreated = columns[0] || '';
      let sourceCol = columns[1] || '';
      
      const cleanTrans = transcreated.toLowerCase().replace(/[\*\s\.\?]/g, '');
      const cleanSource = sourceCol.toLowerCase().replace(/[\*\s\.\?]/g, '');

      if (
        cleanTrans === 'transcreatedtext' ||
        cleanSource === 'sourcefragments' ||
        cleanSource === 'sourcetext' ||
        cleanTrans === 'readytogenerate' ||
        cleanTrans === 'ready' ||
        cleanTrans.includes('thecombinedtranslation') ||
        cleanTrans.includes('waittheprompt') ||
        cleanTrans.includes('output:markdowntable') ||
        cleanTrans.startsWith('row1:') ||
        transcreated.includes('---') ||
        sourceCol.includes('---')
      ) {
        continue;
      }
      
      if (!transcreated && !sourceCol) continue;
      
      const cleanedTransText = transcreated.replace(/^(?:\*\*)?(?:Row|Paragraph|Segment|Section)\s*\d+[:\-\.]?\s*(?:\*\*)?\s*/i, '').trim();
      
      let sourceText = sourceCol;
      let claimedIndices: number[] = [];
      
      if (originalFragments && originalFragments.length > 0) {
        // Parse comma-separated ranges e.g. "1-3, 5"
        const parts = sourceCol.split(',');
        for (const part of parts) {
          const rangeMatch = part.match(/(\d+)\s*-\s*(\d+)/);
          if (rangeMatch) {
            let start = parseInt(rangeMatch[1]);
            let end = parseInt(rangeMatch[2]);
            if (start > end) {
              const temp = start;
              start = end;
              end = temp;
            }
            for (let i = start; i <= end; i++) claimedIndices.push(i - 1);
          } else {
            const numMatch = part.match(/\d+/);
            if (numMatch) claimedIndices.push(parseInt(numMatch[0]) - 1);
          }
        }
        
        claimedIndices = [...new Set(claimedIndices)].sort((a, b) => a - b).filter(i => i >= 0 && i < originalFragments.length);
        
        if (claimedIndices.length === 0) {
          // If the AI failed to output a valid number, it's almost certainly hallucinating reasoning or preamble.
          // We completely ignore this row. The final pass fallback will catch any legitimately missed fragments.
          continue;
        }
        
        sourceText = claimedIndices.map(i => originalFragments[i].text + originalFragments[i].delimiter).join('').trim();
      }
      
      const rowKey = `${cleanedTransText}|||${claimedIndices.join(',')}`;
      if (seenRows.has(rowKey)) continue;
      seenRows.add(rowKey);
      
      rows.push({
        transcreatedText: cleanedTransText,
        sourceText: sourceText,
        claimedIndices
      });
    }
  }
  
  if (isFinal && originalFragments && originalFragments.length > 0) {
    const allClaimed = new Set(rows.flatMap(r => r.claimedIndices));
    const missingIndices = [];
    for (let i = 0; i < originalFragments.length; i++) {
      if (!allClaimed.has(i)) missingIndices.push(i);
    }
    
    if (missingIndices.length > 0) {
      // Append missing fragments as a fallback row
      const missingText = missingIndices.map(i => originalFragments[i].text + originalFragments[i].delimiter).join('').trim();
      if (missingText) {
         rows.push({
           transcreatedText: "*(Translation missed by AI)*",
           sourceText: missingText,
           claimedIndices: missingIndices
         });
      }
    }
  }
  
  return rows.map(r => ({ transcreatedText: r.transcreatedText, sourceText: r.sourceText }));
}

  const triggerAiTranslation = async (textToTranslate: string, append = false) => {
    if (!textToTranslate.trim()) return;
    
    setAiIsTranslating(true);
    setAiError(null);
    setAiUntranslatedText(null);
    
    const existingRows = append ? (aiTranslationData || []) : [];
    if (!append) {
      setAiTranslationData(null);
    }
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
        setAiTranslationData(append ? [...existingRows, ...data.data] : data.data);
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
      
      const originalFragments = fragmentArabicText(textToTranslate);
      
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
              if (data.untranslatedText) {
                setAiUntranslatedText(data.untranslatedText);
              }
              if (data.text) {
                fullText += data.text;
                
                const now = Date.now();
                if (now - lastParseTime > 500) {
                  const rows = parseMarkdownTable(fullText, originalFragments, false);
                  setAiTranslationData(append ? [...existingRows, ...rows] : rows);
                  lastParseTime = now;
                }
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      
      const finalRows = parseMarkdownTable(fullText, originalFragments, true);
      
      if (wasTruncated) {
        if (finalRows.length > 0) {
          const truncationNotice = "\n\n| ⚠️ **Notice:** Your text was extremely long, so the system translated as much as it could. Please copy the remaining untranslated portion and submit it again to continue. | ⚠️ **تنبيه:** لقد قمنا بترجمة أقصى ما يمكن. يرجى نسخ الجزء المتبقي والمحاولة مرة أخرى. |";
          fullText += truncationNotice;
          finalRows.push({
             transcreatedText: "⚠️ **Notice:** Your text was extremely long, so the system translated as much as it could. Please copy the remaining untranslated portion and submit it again to continue.",
             sourceText: "⚠️ **تنبيه:** لقد قمنا بترجمة أقصى ما يمكن. يرجى نسخ الجزء المتبقي والمحاولة مرة أخرى."
          });
        }
      }
      
      if (finalRows.length > 0) {
        setAiTranslationData(append ? [...existingRows, ...finalRows] : finalRows);
      } else if (!append) {
        // Fallback: If AI completely failed to format a table, dump raw text so the user still sees the translation
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
    setAiUntranslatedText(null);
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
        aiUntranslatedText,
        setAiUntranslatedText,
        aiError,
        triggerAiTranslation,
        clearAiTranslation,
        isWordDialogVisible,
        setIsWordDialogVisible,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
