import os
import json
import sqlite3

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

folder_meta = {
    "ar-tafseer-tanwir-al-miqbas": {
        "name": "Tanwir al-Miqbas min Tafsir Ibn Abbas (Arabic Full)",
        "author": "Attributed to Abdullah ibn Abbas",
        "lang_code": "ar", "lang_name": "Arabic", "era": "Classical"
    },
    "ar-tafsir-al-mukhtasar": {
        "name": "Al-Mukhtasar fi Tafsir al-Quran (Arabic Full)",
        "author": "Center for Quranic Interpretation",
        "lang_code": "ar", "lang_name": "Arabic", "era": "Contemporary"
    },
    "en-al-jalalayn": {
        "name": "Tafsir al-Jalalayn (English Full)",
        "author": "Jalal al-Din al-Mahalli & Jalal al-Din al-Suyuti",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-al-qushairi-tafsir": {
        "name": "Lata'if al-Isharat (Tafsir al-Qushayri English)",
        "author": "Imam Abu al-Qasim al-Qushayri",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-asbab-al-nuzul-by-al-wahidi": {
        "name": "Asbab al-Nuzul (Al-Wahidi English)",
        "author": "Imam Ali ibn Ahmad al-Wahidi",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-kashani-tafsir": {
        "name": "Tafsir al-Kashani (English)",
        "author": "Abd al-Razzaq al-Kashani",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-kashf-al-asrar-tafsir": {
        "name": "Kashf al-Asrar (English)",
        "author": "Rashid al-Din Maybudi",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-tafsir-al-mukhtasar": {
        "name": "Abridged Explanation of the Quran (English Full)",
        "author": "Center for Quranic Interpretation",
        "lang_code": "en", "lang_name": "English", "era": "Contemporary"
    },
    "en-tafsir-al-tustari": {
        "name": "Tafsir al-Tustari (English)",
        "author": "Sahl al-Tustari",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-tafsir-ibn-abbas": {
        "name": "Tanwir al-Miqbas min Tafsir Ibn Abbas (English)",
        "author": "Attributed to Abdullah ibn Abbas",
        "lang_code": "en", "lang_name": "English", "era": "Classical"
    },
    "en-tazkirul-quran": {
        "name": "Tazkirul Quran (English Full)",
        "author": "Maulana Wahiduddin Khan",
        "lang_code": "en", "lang_name": "English", "era": "Contemporary"
    },
    "ur-tazkirul-quran": {
        "name": "Tazkirul Quran (Urdu Full)",
        "author": "Maulana Wahiduddin Khan",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Contemporary"
    },
    "ur-tafseer-ibn-e-kaseer": {
        "name": "Tafsir Ibn Kathir (Urdu Full)",
        "author": "Hafiz Ibn Kathir",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Classical"
    },
    "ur-tafsir-bayan-ul-quran": {
        "name": "Bayan-ul-Quran (Urdu Full)",
        "author": "Maulana Ashraf Ali Thanwi / Dr. Israr Ahmed",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern"
    },
    "ur-tafsir-as-saadi-urdu": {
        "name": "Tafsir as-Sa'di (Urdu Full)",
        "author": "Shaykh Abdur-Rahman ibn Nasir as-Sa'di",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern"
    },
    "tafsir-fe-zalul-quran-syed-qatab": {
        "name": "Fi Zilal al-Quran (Urdu Full)",
        "author": "Sayyid Qutb",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern"
    }
}

base_dir = "database/downloaded_tafsirs"
if not os.path.exists(base_dir):
    print("Downloaded tafsirs directory not found!")
    exit(1)

print("Processing full verse-by-verse Tafsir imports...")

for folder, meta in folder_meta.items():
    fdir = os.path.join(base_dir, folder)
    if not os.path.exists(fdir):
        print(f"Skipping {folder}, not downloaded yet.")
        continue

    lang_id = get_or_create_language(meta["lang_code"], meta["lang_name"])
    author_id = get_or_create_author(meta["name"], meta["author"], lang_id, meta["era"])

    # Delete any existing entries for this author to replace with complete dataset
    c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (author_id,))
    
    total_imported = 0
    for surah_idx in range(1, 115):
        fpath = os.path.join(fdir, f"{surah_idx}.json")
        if not os.path.exists(fpath): continue
        
        with open(fpath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                ayahs = []
                if isinstance(data, list):
                    ayahs = data
                elif isinstance(data, dict):
                    ayahs = data.get("ayahs") or data.get("tafsirs") or []

                get_or_create_surah(surah_idx)

                for ayah_idx, ayah_data in enumerate(ayahs):
                    ayah_num = ayah_idx + 1
                    ayah_id = get_or_create_ayah(surah_idx, ayah_num)

                    if isinstance(ayah_data, dict):
                        text = str(ayah_data.get("text", ""))
                    else:
                        text = str(ayah_data)

                    c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                              (author_id, surah_idx, ayah_id, text))
                    total_imported += 1
            except Exception as e:
                print(f"Error parsing {fpath}: {e}")

    conn.commit()
    print(f"Successfully imported {total_imported} verses for {meta['name']}!")

conn.close()
print("FULL Tafsir Import Completed Successfully!")
