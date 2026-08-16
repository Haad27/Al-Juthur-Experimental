import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { useAudioStore } from "@/lib/stores/audioStore";
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
  BookMarked,
  Check,
  Headphones,
} from "lucide-react";

// 9 Authentic Mushaf Layouts from the Quranic Universal Library (QUL) database
const MUSHAF_LAYOUTS = [
  {
    id: "v2",
    name: "Classic Uthmani (Default)",
    subtitle: "Madani Mushaf · KFQPC Hafs",
    fontClass: "font-mushaf-v2",
    scriptFamily: "Uthmanic",
    scriptColor: "emerald",
    region: "Madinah",
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },

  {
    id: "v1",
    name: "Madani Mushaf V1",
    subtitle: "Old KFQPC Glyph Font",
    fontClass: "font-mushaf-v1",
    scriptFamily: "Uthmanic",
    scriptColor: "emerald",
    region: "Madinah",
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },
  {
    id: "uthmani-simple",
    name: "Uthmani Simple",
    subtitle: "UthmanicHafs V18 Text",
    fontClass: "font-mushaf-uthmani-simple",
    scriptFamily: "Uthmanic",
    scriptColor: "emerald",
    region: "Madinah",
    sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  },
  {
    id: "kfqpc",
    name: "KFQPC Premium",
    subtitle: "UthmanicHafs V18 HD",
    fontClass: "font-mushaf-kfqpc",
    scriptFamily: "Uthmanic",
    scriptColor: "emerald",
    region: "Saudi Arabia",
    sample: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  },
  {
    id: "indopak",
    name: "Indo-Pak Nastaleeq",
    subtitle: "Authentic Nastaleeq Script",
    fontClass: "font-mushaf-indopak",
    scriptFamily: "Nastaliq",
    scriptColor: "amber",
    region: "South Asia",
    sample: "بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ",
  },
  {
    id: "indopak-15",
    name: "Indo-Pak 15 Lines",
    subtitle: "Scheherazade · 15 Lines/Page",
    fontClass: "font-mushaf-indopak-15",
    scriptFamily: "Nastaliq",
    scriptColor: "amber",
    region: "South Asia",
    sample: "بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ",
  },
  {
    id: "indopak-16",
    name: "Indo-Pak 16 Lines",
    subtitle: "Lateef · 16 Lines/Page",
    fontClass: "font-mushaf-indopak-16",
    scriptFamily: "Nastaliq",
    scriptColor: "amber",
    region: "Pakistan",
    sample: "بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ",
  },
  {
    id: "naskh",
    name: "Digital Naskh",
    subtitle: "Noto Naskh Arabic · Clean",
    fontClass: "font-mushaf-naskh",
    scriptFamily: "Naskh",
    scriptColor: "blue",
    region: "Digital",
    sample: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  },
  {
    id: "warsh",
    name: "Warsh Script",
    subtitle: "Amiri · Warsh ʿan Nāfiʿ",
    fontClass: "font-mushaf-warsh",
    scriptFamily: "Warsh",
    scriptColor: "purple",
    region: "North Africa",
    sample: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
  },
];

const scriptColorMap: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  purple:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const Settings = () => {
  const {
    fontSize,
    setFontSize,
    wbwFontSize,
    setWbwFontSize,
    mistakeDetection,
    setMistakeDetection,
    showTranslation,
    setShowTranslation,
    showWbw,
    setShowWbw,
    mushafStyle,
    setMushafStyle,
    selectedReciter,
    setSelectedReciter,
  } = useGlobalState();

  const [reciters, setReciters] = React.useState<any[]>([]);

  React.useEffect(() => {
    import("@/api/api").then((module) => {
      module.fetchReciters().then((res) => {
        if (res?.recitations) {
          setReciters(res.recitations);
        }
      });
    });
  }, []);

  // Known reciters with word-by-word segments
  const WBW_RECITERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  
  const wbwRecitersList = reciters.filter(r => WBW_RECITERS.includes(r.id));
  const ayahRecitersList = reciters.filter(r => !WBW_RECITERS.includes(r.id));

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
  };

  const handleWbwFontSizeChange = (val: number[]) => {
    setWbwFontSize(val[0]);
  };

  const fontPresets = [
    { label: "0.5x", val: 0.5 },
    { label: "Small", val: 1 },
    { label: "Standard", val: 1.5 },
    { label: "Large", val: 3 },
    { label: "Extra", val: 5 },
  ];


  const currentStyle = mushafStyle || "v2";
  const activeLayout = MUSHAF_LAYOUTS.find(
    (l) => l.id === currentStyle || (currentStyle === "uthmani" && l.id === "v2")
  ) || MUSHAF_LAYOUTS[0];

  const playbackRate = useAudioStore((s) => s.playbackRate || 1);
  const setPlaybackRate = useAudioStore((s) => s.setPlaybackRate);

  return (
    <div className="p-4 space-y-4 max-w-md overflow-y-auto scrollable-container max-h-[calc(100vh-190px)]">
      <SettingSection
        icon={<Globe className="w-4 h-4 text-emerald-400" />}
        title="Translation"
        control={<TranslationSelector />}
        description="Search & select from 127 translations grouped by language."
      />

      <SettingSection
        icon={<BookMarked className="w-4 h-4 text-emerald-400" />}
        title="Mushaf Script Style"
        control={
          <div className="space-y-3 pt-1">
            {/* Active layout preview */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-200 truncate">{activeLayout.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${scriptColorMap[activeLayout.scriptColor]}`}>
                    {activeLayout.scriptFamily}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">{activeLayout.subtitle}</span>
              </div>
              <span className={`${activeLayout.fontClass} text-emerald-300 text-lg leading-normal`} dir="rtl" lang="ar">
                ﷽
              </span>
            </div>

            {/* 3-column grid of layout options */}
            <div className="grid grid-cols-3 gap-1.5">
              {MUSHAF_LAYOUTS.map((layout) => {
                const isSelected =
                  currentStyle === layout.id ||
                  (currentStyle === "uthmani" && layout.id === "v2");
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setMushafStyle(layout.id)}
                    title={`${layout.name} — ${layout.subtitle}`}
                    className={`relative p-2 rounded-xl border text-left flex flex-col gap-1.5 transition-all duration-200 cursor-pointer group ${
                      isSelected
                        ? "bg-emerald-500/12 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                        : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >

                    {/* Script family badge */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold leading-none ${scriptColorMap[layout.scriptColor]}`}>
                        {layout.scriptFamily}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                    </div>

                    {/* Arabic sample in the layout's font */}
                    <span
                      className={`${layout.fontClass} text-right block w-full leading-relaxed truncate`}
                      style={{ fontSize: "0.85rem", color: isSelected ? "#6ee7b7" : "#a1a1aa" }}
                      dir="rtl"
                      lang="ar"
                    >
                      {layout.sample}
                    </span>

                    {/* Layout name */}
                    <span className={`text-[10px] font-semibold leading-tight truncate ${isSelected ? "text-emerald-300" : "text-zinc-400"}`}>
                      {layout.name}
                    </span>
                    <span className="text-[9px] text-zinc-600 truncate leading-none">{layout.region}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
        description="Choose from 9 authentic Mushaf editions: Uthmanic Hafs (Madani), Indo-Pak Nastaleeq, Digital Naskh, and Warsh script."
      />

      <SettingSection
        icon={<Headphones className="w-4 h-4 text-emerald-400" />}
        title="Audio Reciter"
        control={
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-400">Word-by-Word (Recommended)</span>
              <select
                value={WBW_RECITERS.includes(selectedReciter) ? selectedReciter : ""}
                onChange={(e) => {
                  if (e.target.value) setSelectedReciter(Number(e.target.value));
                }}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50"
              >
                <option value="" disabled>Select a Word-by-Word reciter...</option>
                {wbwRecitersList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reciter_name} {r.style ? `(${r.style})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400">Ayat-by-Ayat (Fallback)</span>
              <select
                value={!WBW_RECITERS.includes(selectedReciter) ? selectedReciter : ""}
                onChange={(e) => {
                  if (e.target.value) setSelectedReciter(Number(e.target.value));
                }}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50"
              >
                <option value="" disabled>Select an Ayat-by-Ayat reciter...</option>
                {ayahRecitersList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reciter_name} {r.style ? `(${r.style})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
        description="Choose your preferred reciter. Word-by-word reciters will highlight the exact word being recited."
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
              defaultValue={[1.5]}
              max={6}
              min={0.5}
              step={0.25}
              onValueChange={handleFontSizeChange}
              className="w-full py-1"
            />

            {/* Quick Presets */}
            <div className="grid grid-cols-5 gap-1 pt-1">

              {fontPresets.map((preset) => {
                const isActive = fontSize === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setFontSize(preset.val)}
                    className={`py-1 text-[10px] md:text-[11px] px-0.5 truncate font-semibold rounded-lg border transition-all cursor-pointer ${
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

            <div className="pt-4 border-t border-zinc-800/60 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-400 font-medium">Word-by-Word Scale</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {wbwFontSize === 0 ? "Default" : `${wbwFontSize}x`}
                </span>
              </div>
              <Slider
                value={[wbwFontSize]}
                defaultValue={[1.5]}
                max={6}
                min={0.5}
                step={0.25}
                onValueChange={handleWbwFontSizeChange}
                className="w-full py-1"
              />
            </div>
          </div>
        }
        description="Adjust text size for comfortable reading. The text scale adjusts the Arabic text and standard translation, while the word-by-word scale independently controls the size of the inline translation."
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
        control={
          <div className="flex items-center gap-3 w-full">
            <Slider
              step={0.25}
              min={0.5}
              max={2}
              value={[playbackRate]}
              onValueChange={(val) => setPlaybackRate(val[0])}
              className="flex-1 py-1"
            />
            <span className="text-xs font-mono font-bold text-emerald-400 min-w-[2.5rem] text-right bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              {playbackRate}x
            </span>
          </div>
        }
        description="Adjust recitation playback speed (0.5x slow to 2.0x fast)."
      />
    </div>
  );
};

export default Settings;
