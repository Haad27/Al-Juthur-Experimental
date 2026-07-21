import { useGlobalState } from "@/lib/providers/GlobalStatesProvider";
import React from "react";
import { useRouter } from "next/navigation";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import SettingSection from "./SettingSection";

const TRANSLATION_OPTIONS = [
  { identifier: "en.sahih", name: "English — Sahih International" },
  { identifier: "en.pickthall", name: "English — Pickthall" },
  { identifier: "en.hilali", name: "English — Hilali & Khan" },
  { identifier: "ur.jalandhry", name: "Urdu — Jalandhry" },
  { identifier: "ur.junagarhi", name: "Urdu — Junagarhi" },
  { identifier: "ur.kanzuliman", name: "Urdu — Ahmed Raza Khan (Kanzul Iman)" },
  { identifier: "hi.hindi", name: "Hindi — Suhel Farooq Khan" },
  { identifier: "bn.bengali", name: "Bengali — Muhiuddin Khan" },
  { identifier: "es.bornez", name: "Spanish — Raúl González Bórnez" },
  { identifier: "es.garcia", name: "Spanish — Muhammad Isa García" },
  { identifier: "fr.hamidullah", name: "French — Muhammad Hamidullah" },
  { identifier: "de.bubenheim", name: "German — Bubenheim & Elyas" },
  { identifier: "tr.yildirim", name: "Turkish — Suat Yildirim" },
  { identifier: "fa.makarem", name: "Persian — Makarem Shirazi" },
  { identifier: "ru.muntahab", name: "Russian — Al-Muntahab" },
  { identifier: "zh.majian", name: "Chinese — Ma Jian" },
  { identifier: "id.indonesian", name: "Indonesian — Indonesian Ministry" },
  { identifier: "ta.tamil", name: "Tamil — Jan Turst Foundation" },
  { identifier: "ml.karakunnu", name: "Malayalam — Cheriyamundam Abdul Hameed" },
];

const Settings = () => {
  const router = useRouter();
  const {
    fontSize,
    setFontSize,
    mistakeDetection,
    setMistakeDetection,
    showTranslation,
    setShowTranslation,
    showWbw,
    setShowWbw,
    translationEdition,
    setTranslationEdition,
  } = useGlobalState();

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
  };

  const handleTranslationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEdition = e.target.value;
    setTranslationEdition(newEdition);
    router.refresh();
  };

  return (
    <div className="p-4 rounded-xl bg-transparent space-y-6 max-w-md overflow-y-auto scrollable-container max-h-[calc(100vh-180px)]">
      <SettingSection
        title="Translation Language"
        control={
          <select
            value={translationEdition}
            onChange={handleTranslationChange}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
          >
            {TRANSLATION_OPTIONS.map((opt) => (
              <option key={opt.identifier} value={opt.identifier} className="dark:bg-zinc-800 bg-white">
                {opt.name}
              </option>
            ))}
          </select>
        }
        description="Choose your preferred local translation language."
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
