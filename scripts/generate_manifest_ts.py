import json
import os

manifest_path = os.path.join("database", "translations", "manifest.json")
output_ts_path = os.path.join("lib", "translationsManifest.ts")

with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

# Sort by language then englishName
language_names = {
  "am": "Amharic",
  "ar": "Arabic",
  "az": "Azerbaijani",
  "ba": "Bashkir",
  "ber": "Berber",
  "bg": "Bulgarian",
  "bn": "Bengali",
  "bs": "Bosnian",
  "ce": "Chechen",
  "cs": "Czech",
  "de": "German",
  "dv": "Divehi",
  "en": "English",
  "es": "Spanish",
  "fa": "Persian",
  "fr": "French",
  "ha": "Hausa",
  "hi": "Hindi",
  "id": "Indonesian",
  "it": "Italian",
  "ja": "Japanese",
  "ko": "Korean",
  "ku": "Kurdish",
  "ml": "Malayalam",
  "ms": "Malay",
  "my": "Burmese",
  "nl": "Dutch",
  "no": "Norwegian",
  "pl": "Polish",
  "ps": "Pashto",
  "pt": "Portuguese",
  "ro": "Romanian",
  "ru": "Russian",
  "sd": "Sindhi",
  "si": "Sinhala",
  "so": "Somali",
  "sq": "Albanian",
  "sv": "Swedish",
  "sw": "Swahili",
  "ta": "Tamil",
  "tg": "Tajik",
  "th": "Thai",
  "tr": "Turkish",
  "tt": "Tatar",
  "ug": "Uyghur",
  "ur": "Urdu",
  "uz": "Uzbek",
  "zh": "Chinese"
}

formatted_items = []
for item in manifest:
    lang_code = item.get("language")
    lang_label = language_names.get(lang_code, lang_code.upper())
    formatted_items.append({
        "identifier": item["identifier"],
        "languageCode": lang_code,
        "languageLabel": lang_label,
        "name": item["name"],
        "englishName": item["englishName"],
        "displayLabel": f"{lang_label}: {item['englishName']} ({item['name']})"
    })

# Sort alphabetically by languageLabel then englishName
formatted_items.sort(key=lambda x: (x["languageLabel"], x["englishName"]))

ts_content = f"""// Auto-generated manifest of all {len(formatted_items)} local translation datasets
export interface TranslationOption {{
  identifier: string;
  languageCode: string;
  languageLabel: string;
  name: string;
  englishName: string;
  displayLabel: string;
}}

export const ALL_TRANSLATION_OPTIONS: TranslationOption[] = {json.dumps(formatted_items, ensure_ascii=False, indent=2)};
"""

with open(output_ts_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"Generated {output_ts_path} with {len(formatted_items)} translations.")
