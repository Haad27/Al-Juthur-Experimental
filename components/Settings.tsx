import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import React from "react";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import SettingSection from "./SettingSection";
import TranslationSelector from "./TranslationSelector";

const Settings = () => {
  const {
    fontSize,
    setFontSize,
    mistakeDetection,
    setMistakeDetection,
    showTranslation,
    setShowTranslation,
    showWbw,
    setShowWbw,
  } = useGlobalState();

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
  };

  return (
    <div className="p-4 rounded-xl bg-transparent space-y-6 max-w-md overflow-y-auto scrollable-container max-h-[calc(100vh-180px)]">
      <SettingSection
        title="Translation Language"
        control={<TranslationSelector />}
        description="Search & select from 124 local offline translations grouped by language."
      />

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
        title="Show Word-by-Word Translation"
        control={
          <Switch
            checked={showWbw}
            onCheckedChange={setShowWbw}
          />
        }
        description="Toggle whether the English meaning is shown beneath every Arabic word."
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
