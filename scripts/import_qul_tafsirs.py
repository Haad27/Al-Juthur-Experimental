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

# 1. Pashto Al-Mukhtasar
pashto_dir = "database/tafsir-database/Pashto/pashto-mokhtasar"
if os.path.exists(pashto_dir) and len(os.listdir(pashto_dir)) > 0:
    print("Importing Pashto Al-Mukhtasar...")
    pashto_lang_id = get_or_create_language("ps", "Pashto")
    author_id = get_or_create_author("Al-Mukhtasar (Pashto)", "Center for Quranic Interpretation (Al-Mukhtasar)", pashto_lang_id, "Contemporary")
    
    imported_count = 0
    for surah_idx in range(1, 115):
        fpath = os.path.join(pashto_dir, f"{surah_idx}.json")
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
                        
                    c.execute("SELECT id FROM TafsirEntry WHERE authorId = ? AND surahId = ? AND ayahId = ?", (author_id, surah_idx, ayah_id))
                    if not c.fetchone():
                        c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)", (author_id, surah_idx, ayah_id, text))
                        imported_count += 1
            except Exception as e:
                print(f"Error parsing Pashto surah {surah_idx}: {e}")

    print(f"Imported {imported_count} Pashto Tafsir entries!")

conn.commit()

# 2. QUL Additional Tafsirs Setup
additional_tafsirs = [
    {
        "name": "Tafsir Muqatil ibn Sulayman",
        "authorName": "Imam Muqatil ibn Sulayman (d. 150 AH)",
        "lang_code": "ar", "lang_name": "Arabic", "era": "Classical",
        "desc": "The earliest surviving complete line-by-line Tafsir of the Quran from the 2nd century AH."
    },
    {
        "name": "Al-Muntakhab fi Tafsir al-Quran",
        "authorName": "Supreme Council for Islamic Affairs (Egypt)",
        "lang_code": "ar", "lang_name": "Arabic", "era": "Contemporary",
        "desc": "Scholarly contemporary Arabic commentary produced by Egypt's Supreme Council for Islamic Affairs."
    },
    {
        "name": "Al-Mushaf al-Mufassar",
        "authorName": "Shaykh Muhammad Farid Wajdi",
        "lang_code": "ar", "lang_name": "Arabic", "era": "Modern",
        "desc": "Concise analytical explanation of Quranic vocabulary and meanings."
    },
    {
        "name": "Tafheem-ul-Quran (Urdu)",
        "authorName": "Sayyid Abul A'la Maududi",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern",
        "desc": "Profound 6-volume contemporary Urdu translation and exegesis focusing on real-world guidance."
    },
    {
        "name": "Tadabbur-e-Quran (Urdu)",
        "authorName": "Maulana Amin Ahsan Islahi",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern",
        "desc": "Masterpiece of structural coherence (Nazm) and thematic unity in the Quran."
    },
    {
        "name": "Aasan Tarjuma Quran & Notes (Urdu)",
        "authorName": "Mufti Muhammad Taqi Usmani",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Contemporary",
        "desc": "Lucid, universally acclaimed modern Urdu translation with explanatory footnotes."
    },
    {
        "name": "Tafseer-e-Usmani (Urdu)",
        "authorName": "Maulana Shabbir Ahmad Usmani",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern",
        "desc": "Classical scholarly Urdu commentary based on the notes of Sheikh-ul-Hind Mahmud Hasan."
    },
    {
        "name": "Tafseer-e-Majidi (Urdu / English)",
        "authorName": "Maulana Abdul Majid Daryabadi",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Modern",
        "desc": "Unique comparative study comparing Quranic verses with classical biblical texts."
    },
    {
        "name": "Tafseer-e-Mazhari (Urdu)",
        "authorName": "Qazi Thanaullah Panipati",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Classical",
        "desc": "Detailed Sunni Sufi and jurisprudence exegesis written in the 12th century AH."
    },
    {
        "name": "Tibyan-ul-Quran (Urdu)",
        "authorName": "Maulana Ghulam Rasool Saeedi",
        "lang_code": "ur", "lang_name": "Urdu", "era": "Contemporary",
        "desc": "Extensive 12-volume scholarly Urdu commentary detailing classical rulings and Hadith."
    }
]

print("Setting up QUL additional Tafsir authors in database...")
for item in additional_tafsirs:
    lang_id = get_or_create_language(item["lang_code"], item["lang_name"])
    author_id = get_or_create_author(item["name"], item["authorName"], lang_id, item["era"])
    
    c.execute("SELECT COUNT(*) FROM TafsirEntry WHERE authorId = ?", (author_id,))
    cnt = c.fetchone()[0]
    
    if cnt == 0:
        for surah_idx in range(1, 115):
            get_or_create_surah(surah_idx)
            c.execute("SELECT id FROM Ayah WHERE surahId = ? AND numberInSurah = 1", (surah_idx,))
            row = c.fetchone()
            if row:
                ayah_id = row[0]
                sample_text = f"[{item['name']} - {item['authorName']}]\n{item['desc']}\n(Full digital text available in QUL repository and classical reference library)."
                c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)", (author_id, surah_idx, ayah_id, sample_text))

conn.commit()
conn.close()
print("QUL Tafsirs setup complete!")
