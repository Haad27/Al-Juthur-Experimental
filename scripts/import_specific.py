import os
import json
import sqlite3

base_dir = "database/tafsir-database/english"
db_path = "prisma/dev.db"

folders = [
    "en-kashf-al-asrar-tafsir",
    "en-al-qushairi-tafsir",
    "en-kashani-tafsir",
    "en-tafsir-al-tustari",
    "en-asbab-al-nuzul-by-al-wahidi",
    "en-tafsir-ibn-abbas",
    "en-al-jalalayn"
]

print("Connecting to DB...")
conn = sqlite3.connect(db_path)
c = conn.cursor()

def get_or_create_language(code, name):
    c.execute("SELECT id FROM Language WHERE code = ?", (code,))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Language (code, name) VALUES (?, ?)", (code, name))
    return c.lastrowid

def get_or_create_author(name, lang_id):
    c.execute("SELECT id FROM Author WHERE name = ? AND languageId = ?", (name, lang_id))
    row = c.fetchone()
    if row: return row[0]
    c.execute("INSERT INTO Author (name, languageId) VALUES (?, ?)", (name, lang_id))
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

lang_id = get_or_create_language('en', 'english')

print("Starting custom import...")
for folder in folders:
    folder_path = os.path.join(base_dir, folder)
    if not os.path.exists(folder_path):
        print(f"Skipping {folder}, not found.")
        continue
    
    author_name = folder.replace('-', ' ').title()
    author_id = get_or_create_author(author_name, lang_id)
    print(f"Importing {author_name}...")
    
    for surah_idx in range(1, 115):
        file_path = os.path.join(folder_path, f"{surah_idx}.json")
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
                
            ayahs = []
            if isinstance(data, dict):
                ayahs = data.get('ayahs') or data.get('tafsirs') or []
            elif isinstance(data, list):
                ayahs = data
                
            get_or_create_surah(surah_idx)
            
            for ayah_idx, ayah_data in enumerate(ayahs):
                ayah_num = ayah_idx + 1
                ayah_id = get_or_create_ayah(surah_idx, ayah_num)
                
                text = str(ayah_data.get('text', ayah_data))
                
                # Check if it exists to avoid duplicates
                c.execute("SELECT id FROM TafsirEntry WHERE authorId = ? AND surahId = ? AND ayahId = ?", (author_id, surah_idx, ayah_id))
                if not c.fetchone():
                    c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)", (author_id, surah_idx, ayah_id, text))

    conn.commit()
    print(f"Finished {author_name}.")

conn.close()
print("Custom import complete!")
