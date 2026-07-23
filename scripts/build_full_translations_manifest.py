import json
import os

# Load existing manifests
with open('database/translations/all_api_editions.json', 'r', encoding='utf-8') as f:
    cloud_editions = json.load(f)

with open('database/translations/qurancom_editions.json', 'r', encoding='utf-8') as f:
    qurancom_editions = json.load(f)

with open('database/translations/manifest.json', 'r', encoding='utf-8') as f:
    local_manifest = json.load(f)

options_map = {}

# 1. Add local manifest entries
for e in local_manifest:
    ident = e['identifier']
    options_map[ident] = {
        "identifier": ident,
        "languageCode": e.get("language", ident.split('.')[0] if '.' in ident else "en"),
        "languageLabel": e.get("languageName", e.get("language", "English")).title(),
        "name": e.get("name", ident),
        "englishName": e.get("englishName", e.get("name", ident)),
        "displayLabel": f"{e.get('languageName', 'Language')}: {e.get('englishName', ident)} ({e.get('name', ident)})"
    }

# 2. Add Al-Quran Cloud API editions
for e in cloud_editions:
    ident = e['identifier']
    if ident not in options_map:
        lang_code = e.get('language', 'en')
        lang_name = e.get('englishName', lang_code).title()
        if lang_code == 'ur': lang_name = 'Urdu'
        elif lang_code == 'en': lang_name = 'English'
        elif lang_code == 'ar': lang_name = 'Arabic'
        elif lang_code == 'bn': lang_name = 'Bengali'
        elif lang_code == 'tr': lang_name = 'Turkish'
        elif lang_code == 'fa': lang_name = 'Persian'
        elif lang_code == 'ru': lang_name = 'Russian'
        elif lang_code == 'es': lang_name = 'Spanish'
        elif lang_code == 'fr': lang_name = 'French'
        elif lang_code == 'de': lang_name = 'German'
        elif lang_code == 'id': lang_name = 'Indonesian'
        
        name = e.get('name', ident)
        eng_name = e.get('englishName', name)
        
        options_map[ident] = {
            "identifier": ident,
            "languageCode": lang_code,
            "languageLabel": lang_name,
            "name": name,
            "englishName": eng_name,
            "displayLabel": f"{lang_name}: {eng_name} ({name})"
        }

# 3. Add Quran.com API v4 translations
for e in qurancom_editions:
    id_num = e['id']
    ident = f"qurancom.{id_num}"
    name = e.get('name', '')
    author_name = e.get('author_name', name)
    lang_name = e.get('language_name', 'English').title()

    if ident not in options_map:
        options_map[ident] = {
            "identifier": ident,
            "languageCode": e.get("language_name", "en")[:2].lower(),
            "languageLabel": lang_name,
            "name": name,
            "englishName": author_name,
            "displayLabel": f"{lang_name}: {author_name} ({name})"
        }

all_options = list(options_map.values())
# Sort by languageLabel, then englishName
all_options.sort(key=lambda x: (x['languageLabel'], x['englishName']))

print(f"Total Unique Translation Options Merged: {len(all_options)}")

# Save updated database/translations/manifest.json
with open('database/translations/manifest.json', 'w', encoding='utf-8') as out:
    json.dump(all_options, out, indent=2, ensure_ascii=False)

# Generate lib/translationsManifest.ts
ts_content = f"""// Auto-generated full translations manifest containing all {len(all_options)} translation editions
export interface TranslationOption {{
  identifier: string;
  languageCode: string;
  languageLabel: string;
  name: string;
  englishName: string;
  displayLabel: string;
}}

export const ALL_TRANSLATION_OPTIONS: TranslationOption[] = {json.dumps(all_options, indent=2, ensure_ascii=False)};
"""

with open('lib/translationsManifest.ts', 'w', encoding='utf-8') as out:
    out.write(ts_content)

print(f"Successfully generated lib/translationsManifest.ts with {len(all_options)} translation options!")
