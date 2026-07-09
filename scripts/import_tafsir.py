import os
import json
import sqlite3
import zipfile

db_path = "dev.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

def get_or_create_language(code, name):
    c.execute("SELECT id FROM Language WHERE code = ?", (code,))
    row = c.fetchone()
    if row:
        return row[0]
    c.execute("INSERT INTO Language (code, name) VALUES (?, ?)", (code, name))
    return c.lastrowid

def get_or_create_author(name, lang_id):
    c.execute("SELECT id FROM Author WHERE name = ? AND languageId = ?", (name, lang_id))
    row = c.fetchone()
    if row:
        return row[0]
    c.execute("INSERT INTO Author (name, languageId) VALUES (?, ?)", (name, lang_id))
    return c.lastrowid

def get_or_create_surah(surah_id):
    c.execute("SELECT id FROM Surah WHERE id = ?", (surah_id,))
    row = c.fetchone()
    if row:
        return row[0]
    c.execute("INSERT INTO Surah (id, name, englishName) VALUES (?, ?, ?)", (surah_id, f"Surah {surah_id}", f"Surah {surah_id}"))
    return surah_id

def get_or_create_ayah(surah_id, ayah_num):
    c.execute("SELECT id FROM Ayah WHERE surahId = ? AND numberInSurah = ?", (surah_id, ayah_num))
    row = c.fetchone()
    if row:
        return row[0]
    c.execute("INSERT INTO Ayah (surahId, numberInSurah, text) VALUES (?, ?, ?)", (surah_id, ayah_num, "Arabic Text"))
    return c.lastrowid

def insert_tafsir(author_id, surah_id, ayah_id, text):
    c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)", (author_id, surah_id, ayah_id, text))

def process_json_data(data, author_id):
    entries = data
    if isinstance(data, dict):
        if 'tafsirs' in data:
            entries = data['tafsirs']
        elif 'ayahs' in data:
            entries = data['ayahs']

    if isinstance(entries, dict):
        for key, value in entries.items():
            if ':' in key:
                parts = key.split(':')
                if len(parts) == 2:
                    try:
                        surah_num = int(parts[0])
                        ayah_num = int(parts[1])
                        text = value.get('text', str(value)) if isinstance(value, dict) else str(value)
                        
                        get_or_create_surah(surah_num)
                        ayah_id = get_or_create_ayah(surah_num, ayah_num)
                        insert_tafsir(author_id, surah_num, ayah_id, text)
                    except Exception as e:
                        print("Error parsing key", key, e)
    elif isinstance(entries, list):
        for entry in entries:
            try:
                if 'surah' in entry and 'ayah' in entry:
                    surah_num = int(entry['surah'])
                    ayah_num = int(entry['ayah'])
                    text = entry.get('text', '')
                    get_or_create_surah(surah_num)
                    ayah_id = get_or_create_ayah(surah_num, ayah_num)
                    insert_tafsir(author_id, surah_num, ayah_id, text)
            except Exception as e:
                print("Error parsing list entry", e)

def process_file(filepath, lang_name):
    lang_code = lang_name[:2].lower()
    if lang_name.lower() == 'english':
        lang_code = 'en'
    elif lang_name.lower() == 'arabic':
        lang_code = 'ar'
    elif lang_name.lower() == 'urdu':
        lang_code = 'ur'
        
    lang_id = get_or_create_language(lang_code, lang_name)
    
    filename = os.path.basename(filepath)
    author_name = filename.replace('.json.zip', '').replace('.json', '').replace('-', ' ').title()
    author_id = get_or_create_author(author_name, lang_id)

    if filepath.endswith('.zip'):
        with zipfile.ZipFile(filepath, 'r') as z:
            for zip_member in z.namelist():
                if zip_member.endswith('.json'):
                    with z.open(zip_member) as f:
                        data = json.load(f)
                        process_json_data(data, author_id)
    elif filepath.endswith('.json'):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            process_json_data(data, author_id)

    conn.commit()

base_dir = "database/tafsir-database"
print(f"Scanning directory: {base_dir}")

for lang_folder in os.listdir(base_dir):
    lang_path = os.path.join(base_dir, lang_folder)
    if os.path.isdir(lang_path):
        for file in os.listdir(lang_path):
            filepath = os.path.join(lang_path, file)
            if file.endswith('.json.zip') or file.endswith('.json'):
                print(f"Processing: {lang_folder} -> {file}")
                try:
                    process_file(filepath, lang_folder)
                except Exception as e:
                    print(f"Failed to process {file}: {e}")

print("Import Complete!")
conn.close()
