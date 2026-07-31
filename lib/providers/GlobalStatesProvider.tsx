"use client";
// lib/GlobalStateContext.tsx
import React, { createContext, useState, useContext } from "react";
import { toast } from "sonner";

// Define the shape of the global state
interface GlobalState {
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
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
  const [aiError, setAiError] = useState<string | null>(null);

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

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Translation failed');
      }

      setAiTranslationData(data.data);
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
