import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import React, { useEffect, useState } from "react";
import { Slider } from "./ui/slider";
import ThemeToggleButton from "./ThemeToggleButton";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@radix-ui/react-select";
import SettingSection from "./SettingSection";

const Settings = () => {
  const {
    fontSize,
    setFontSize,
    mistakeDetection,
    setMistakeDetection,
    showTranslation,
    setShowTranslation,
  } = useGlobalState();
  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
  };

  return (
    <div className="p-4 rounded-xl bg-transparent space-y-6 max-w-md">
      <SettingSection
        title="Font and Text Size"
        control={
          <>
            <div className="flex justify-between">
              <p className="text-lg font-semibold dark:text-emerald-500 text-black">
                {fontSize.toString() === "0" ? "Base" : `${fontSize}x`}
              </p>
            </div>
            <Slider
              value={[fontSize]}
              defaultValue={[3]}
              max={8}
              step={1}
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
          </>
        }
        description="Adjust the size of Arabic and translation text to suit your reading comfort."
      />

      <SettingSection
        title="Mistake Detection"
        control={
          <Switch
            checked={mistakeDetection}
            onCheckedChange={setMistakeDetection}
          />
        }
        description="Automatically replay the verse when a recitation mistake is detected."
      />

      <SettingSection
        title="Show Translation"
        control={
          <Switch
            checked={showTranslation}
            onCheckedChange={setShowTranslation}
          />
        }
        description="Toggle whether translations are shown beneath the Arabic text."
      />

      <SettingSection
        title="Audio Playback Speed"
        control={<Slider step={0.25} min={0.5} max={2} className="w-full" />}
        description="Adjust the recitation speed to your preference (slow or fast)."
      />
    </div>
  );
};

export default Settings;
