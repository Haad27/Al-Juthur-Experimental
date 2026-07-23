import os
import json
import sqlite3
import zipfile

db_path = "prisma/dev.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

def get_or_create_language(code, name):
    c.execute("SELECT id FROM Language WHERE code = ?", (code,))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Language (code, name) VALUES (?, ?)", (code, name))
    return c.lastrowid

def get_or_create_author(name, author_name, lang_id, era="Classical"):
    c.execute("SELECT id FROM Author WHERE name = ? AND languageId = ?", (name, lang_id))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Author (name, authorName, languageId, era) VALUES (?, ?, ?, ?)", (name, author_name, lang_id, era))
    return c.lastrowid

def get_or_create_surah(surah_id):
    c.execute("SELECT id FROM Surah WHERE id = ?", (surah_id,))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Surah (id, name, englishName) VALUES (?, ?, ?)", (surah_id, f"Surah {surah_id}", f"Surah {surah_id}"))
    return surah_id

def get_or_create_ayah(surah_id, ayah_num):
    c.execute("SELECT id FROM Ayah WHERE surahId = ? AND numberInSurah = ?", (surah_id, ayah_num))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Ayah (surahId, numberInSurah, text) VALUES (?, ?, ?)", (surah_id, ayah_num, "Arabic Text"))
    return c.lastrowid

zip_path = "database/tafsir_api_main.zip"
if not os.path.exists(zip_path):
    print("Zip file database/tafsir_api_main.zip not found yet!")
    conn.close()
    exit(1)

print("Opening database/tafsir_api_main.zip...")
with zipfile.ZipFile(zip_path, 'r') as z:
    all_files = z.namelist()
    
    # Map of folder_name -> list of zip_entry_paths
    folder_entries = {}
    for item in all_files:
        # e.g., "tafsir_api-main/tafsir/ur-tafsir-bayan-ul-quran/1.json"
        parts = item.split('/')
        if len(parts) >= 4 and parts[1] == "tafsir" and parts[3].endswith('.json'):
            folder = parts[2]
            if folder not in folder_entries:
                folder_entries[folder] = []
            folder_entries[folder].append((parts[3], item))

    print(f"Found {len(folder_entries)} Tafsir folders in zip archive.")

    # Helper mapping for folder names to human readable titles, authors, and languages
    for folder, entries in folder_entries.items():
        # Determine language
        lang_code = "ar"
        lang_name = "Arabic"
        if folder.startswith("en-") or folder.endswith("-en"):
            lang_code, lang_name = "en", "English"
        elif folder.startswith("ur-") or folder.endswith("-ur") or "urdu" in folder:
            lang_code, lang_name = "ur", "Urdu"
        elif folder.startswith("bn-") or "bengali" in folder:
            lang_code, lang_name = "bn", "Bengali"
        elif folder.startswith("ru-") or "russian" in folder:
            lang_code, lang_name = "ru", "Russian"
        elif folder.startswith("tr-") or "turkish" in folder:
            lang_code, lang_name = "tr", "Turkish"
        elif folder.startswith("id-") or folder.startswith("in-") or "indonesian" in folder:
            lang_code, lang_name = "id", "Indonesian"
        elif folder.startswith("kurd") or "kurdish" in folder:
            lang_code, lang_name = "ku", "Kurdish"
        elif folder.startswith("fr-") or "french" in folder:
            lang_code, lang_name = "fr", "French"
        elif folder.startswith("es-") or "spanish" in folder:
            lang_code, lang_name = "es", "Spanish"
        elif "pashto" in folder:
            lang_code, lang_name = "ps", "Pashto"

        display_name = folder.replace('-', ' ').title()
        author_name = f"Scholarly Commentary ({display_name})"
        
        # Clean up specific names
        if folder == "ur-tafsir-bayan-ul-quran":
            display_name = "Bayan-ul-Quran (Urdu Complete)"
            author_name = "Maulana Ashraf Ali Thanwi / Dr. Israr Ahmed"
        elif folder == "ur-tafseer-ibn-e-kaseer":
            display_name = "Tafsir Ibn Kathir (Urdu Complete)"
            author_name = "Hafiz Ibn Kathir"
        elif folder == "tafsir-fe-zalul-quran-syed-qatab":
            display_name = "Fi Zilal al-Quran (Urdu Complete)"
            author_name = "Sayyid Qutb"
        elif folder == "ur-tazkirul-quran":
            display_name = "Tazkirul Quran (Urdu Complete)"
            author_name = "Maulana Wahiduddin Khan"
        elif folder == "en-tazkirul-quran":
            display_name = "Tazkirul Quran (English Complete)"
            author_name = "Maulana Wahiduddin Khan"
        elif folder == "ar-tafsir-al-mukhtasar":
            display_name = "Al-Mukhtasar fi Tafsir al-Quran (Arabic)"
            author_name = "Center for Quranic Interpretation"
        elif folder == "ar-tafseer-tanwir-al-miqbas":
            display_name = "Tanwir al-Miqbas min Tafsir Ibn Abbas (Arabic)"
            author_name = "Attributed to Abdullah ibn Abbas"

        lang_id = get_or_create_language(lang_code, lang_name)
        author_id = get_or_create_author(display_name, author_name, lang_id)

        # Check existing entries count
        c.execute("SELECT COUNT(*) FROM TafsirEntry WHERE authorId = ?", (author_id,))
        existing_cnt = c.fetchone()[0]

        # If entries exist but only 114 (placeholder for verse 1), remove placeholders to overwrite with FULL Tafsir
        if 0 < existing_cnt < 6000:
            print(f"Replacing placeholder entries for {display_name}...")
            c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (author_id,))
            existing_cnt = 0

        if existing_cnt >= 6000:
            print(f"Skipping {display_name}, already has {existing_cnt} entries.")
            continue

        print(f"Importing FULL verse-by-verse Tafsir for {display_name} ({len(entries)} surah files)...")
        inserted_for_author = 0

        for json_filename, zip_entry_path in entries:
            try:
                surah_num = int(json_filename.replace('.json', ''))
            except:
                continue

            get_or_create_surah(surah_num)

            with z.open(zip_entry_path) as f:
                try:
                    data = json.load(f)
                    ayahs = []
                    if isinstance(data, list):
                        ayahs = data
                    elif isinstance(data, dict):
                        ayahs = data.get("ayahs") or data.get("tafsirs") or []

                    for ayah_idx, ayah_data in enumerate(ayahs):
                        ayah_num = ayah_idx + 1
                        ayah_id = get_or_create_ayah(surah_num, ayah_num)

                        if isinstance(ayah_data, dict):
                            text = str(ayah_data.get("text", ""))
                        else:
                            text = str(ayah_data)

                        c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                                  (author_id, surah_num, ayah_id, text))
                        inserted_for_author += 1
                except Exception as e:
                    print(f"Error parsing {zip_entry_path}: {e}")

        conn.commit()
        print(f"  --> Inserted {inserted_for_author} verses for {display_name}.")

conn.close()
print("All Tafsirs full import complete!")
