"use client";
// lib/GlobalStateContext.tsx
import React, { createContext, useState, useContext } from "react";

// Define the shape of the global state
interface GlobalState {
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  mistakeDetection: boolean;
  setMistakeDetection: React.Dispatch<React.SetStateAction<boolean>>;
  showTranslation: boolean;
  setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [showTranslation, setShowTranslation] = useState(true);

  return (
    <GlobalStateContext.Provider
      value={{
        fontSize,
        setFontSize,
        mistakeDetection,
        setMistakeDetection,
        showTranslation,
        setShowTranslation,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
