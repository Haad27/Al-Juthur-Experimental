import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import React from "react";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import SettingSection from "./SettingSection";
import TranslationSelector from "./TranslationSelector";
import {
  Globe,
  Type,
  ShieldAlert,
  Languages,
  BookOpenCheck,
  Zap,
} from "lucide-react";

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

  const fontPresets = [
    { label: "Small", val: 1 },
    { label: "Standard", val: 3 },
    { label: "Large", val: 5 },
    { label: "Extra", val: 7 },
  ];

  return (
    <div className="p-4 space-y-4 max-w-md overflow-y-auto scrollable-container max-h-[calc(100vh-190px)]">
      <SettingSection
        icon={<Globe className="w-4 h-4 text-emerald-400" />}
        title="Translation Language"
        control={<TranslationSelector />}
        description="Search & select from 124 local offline translations grouped by language."
      />

      <SettingSection
        icon={<Type className="w-4 h-4 text-emerald-400" />}
        title="Font & Text Size"
        control={
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Text Scale</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {fontSize === 0 ? "Default" : `${fontSize}x`}
              </span>
            </div>

            <Slider
              value={[fontSize]}
              defaultValue={[3]}
              max={8}
              min={1}
              step={1}
              onValueChange={handleFontSizeChange}
              className="w-full py-1"
            />

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {fontPresets.map((preset) => {
                const isActive = fontSize === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setFontSize(preset.val)}
                    className={`py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:bg-zinc-700/80 hover:text-zinc-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
        description="Adjust Arabic and translation text sizing to suit your reading comfort."
      />

      <SettingSection
        icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
        title="Mistake Detection"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Recitation Replay</span>
            <Switch
              checked={mistakeDetection}
              onCheckedChange={setMistakeDetection}
            />
          </div>
        }
        description="Automatically replay the verse when a recitation mistake is detected."
      />

      <SettingSection
        icon={<Languages className="w-4 h-4 text-emerald-400" />}
        title="Show Translation"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Verse Translation</span>
            <Switch
              checked={showTranslation}
              onCheckedChange={setShowTranslation}
            />
          </div>
        }
        description="Toggle whether verse translations are shown beneath Arabic text."
      />

      <SettingSection
        icon={<BookOpenCheck className="w-4 h-4 text-emerald-400" />}
        title="Word-by-Word Meaning"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Word Tooltips & Labels</span>
            <Switch
              checked={showWbw}
              onCheckedChange={setShowWbw}
            />
          </div>
        }
        description="Show word-by-word meaning beneath every Arabic word token."
      />

      <SettingSection
        icon={<Zap className="w-4 h-4 text-emerald-400" />}
        title="Audio Playback Speed"
        control={<Slider step={0.25} min={0.5} max={2} defaultValue={[1]} className="w-full py-1" />}
        description="Adjust recitation playback speed (0.5x slow to 2.0x fast)."
      />
    </div>
  );
};

export default Settings;
