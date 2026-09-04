import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import { useAudioStore } from "@/lib/stores/audioStore";
import React from "react";
import Link from "next/link";
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
  Crown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";

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
  emerald: "bg-accent/10 text-accent border-accent/20",
  amber:   "bg-accent/10 text-accent border-accent/20",
  blue:    "bg-accent/10 text-accent border-accent/20",
  purple:  "bg-accent/10 text-accent border-accent/20",
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

  const { tier, openPricingModal, dailyQueriesLimit, activePromoCode } = useSubscriptionStore();
  const playbackRate = useAudioStore((s) => s.playbackRate || 1);
  const setPlaybackRate = useAudioStore((s) => s.setPlaybackRate);

  return (
    <div className="p-2 sm:p-4 space-y-4 max-w-md w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden scrollable-container max-h-[calc(100vh-190px)] touch-pan-y">
      {/* Subscription & AI Quota Banner (Temporarily commented out - Full Free mode) */}
      {/* <div className="p-3.5 rounded-2xl bg-gradient-to-br from-accent/10 via-card to-card border border-accent/25 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {tier} Plan
                </span>
                {activePromoCode && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-mono">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {dailyQueriesLimit} AI questions per day
              </p>
            </div>
          </div>
          <button
            onClick={openPricingModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold transition-all shadow-md /40 cursor-pointer"
          >
            <span>{tier === "FREE" ? "Upgrade" : "Manage"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div> */}

      <SettingSection
        icon={<Globe className="w-4 h-4 text-accent" />}
        title="Translation"
        control={<TranslationSelector />}
        description="Search & select from 127 translations grouped by language."
      />

      <SettingSection
        icon={<BookMarked className="w-4 h-4 text-accent" />}
        title="Mushaf Script Style"
        control={
          <div className="space-y-3 pt-1 w-full min-w-0 max-w-full">
            {/* Active layout preview */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border w-full min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">{activeLayout.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${scriptColorMap[activeLayout.scriptColor]}`}>
                    {activeLayout.scriptFamily}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">{activeLayout.subtitle}</span>
              </div>
              <span className={`${activeLayout.fontClass} text-accent text-lg leading-normal shrink-0`} dir="rtl" lang="ar">
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
                        ? "bg-accent/12 border-accent/40 shadow-lg "
                        : "bg-muted/70 border-border hover:bg-muted hover:border-border"
                    }`}
                  >

                    {/* Script family badge */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold leading-none ${scriptColorMap[layout.scriptColor]}`}>
                        {layout.scriptFamily}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-accent shrink-0" />
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
                    <span className={`text-[10px] font-semibold leading-tight truncate ${isSelected ? "text-accent" : "text-muted-foreground"}`}>
                      {layout.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate leading-none">{layout.region}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
        description="Choose from 9 authentic Mushaf editions: Uthmanic Hafs (Madani), Indo-Pak Nastaleeq, Digital Naskh, and Warsh script."
      />

      <SettingSection
        icon={<Headphones className="w-4 h-4 text-accent" />}
        title="Audio Reciter"
        control={
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-accent">Word-by-Word (Recommended)</span>
              <select
                value={WBW_RECITERS.includes(selectedReciter) ? selectedReciter : ""}
                onChange={(e) => {
                  if (e.target.value) setSelectedReciter(Number(e.target.value));
                }}
                className="w-full bg-muted/70 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
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
              <span className="text-xs font-semibold text-muted-foreground">Ayat-by-Ayat (Fallback)</span>
              <select
                value={!WBW_RECITERS.includes(selectedReciter) ? selectedReciter : ""}
                onChange={(e) => {
                  if (e.target.value) setSelectedReciter(Number(e.target.value));
                }}
                className="w-full bg-muted/70 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
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
        icon={<Type className="w-4 h-4 text-accent" />}
        title="Font & Text Size"
        control={
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Text Scale</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-accent/10 text-accent border border-accent/30">
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
                        ? "bg-accent text-foreground border-accent shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">Word-by-Word Scale</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-accent/10 text-accent border border-accent/30">
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
        icon={<ShieldAlert className="w-4 h-4 text-accent" />}
        title="Mistake Detection"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-reading">Recitation Replay</span>
            <Switch
              checked={mistakeDetection}
              onCheckedChange={setMistakeDetection}
            />
          </div>
        }
        description="Automatically replay the verse when a recitation mistake is detected."
      />

      <SettingSection
        icon={<Languages className="w-4 h-4 text-accent" />}
        title="Show Translation"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-reading">Verse Translation</span>
            <Switch
              checked={showTranslation}
              onCheckedChange={setShowTranslation}
            />
          </div>
        }
        description="Toggle whether verse translations are shown beneath Arabic text."
      />

      <SettingSection
        icon={<BookOpenCheck className="w-4 h-4 text-accent" />}
        title="Word-by-Word Meaning"
        control={
          <div className="flex items-center justify-between">
            <span className="text-xs text-reading">Word Tooltips & Labels</span>
            <Switch
              checked={showWbw}
              onCheckedChange={setShowWbw}
            />
          </div>
        }
        description="Show word-by-word meaning beneath every Arabic word token."
      />

      <SettingSection
        icon={<Zap className="w-4 h-4 text-accent" />}
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
            <span className="text-xs font-mono font-bold text-accent min-w-[2.5rem] text-right bg-accent/10 px-2 py-0.5 rounded border border-accent/30">
              {playbackRate}x
            </span>
          </div>
        }
        description="Adjust recitation playback speed (0.5x slow to 2.0x fast)."
      />

      {/* Subtle Legal & Policy Links Footer */}
      <div className="pt-4 pb-2 border-t border-border mt-4 text-center">
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground font-medium">
          <Link
            href="/legal?tab=terms"
            className="hover:text-reading transition-colors"
          >
            Terms
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/legal?tab=privacy"
            className="hover:text-reading transition-colors"
          >
            Privacy
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/legal?tab=refund"
            className="hover:text-reading transition-colors"
          >
            Refund Policy
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
          Al-Juthur © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Settings;
