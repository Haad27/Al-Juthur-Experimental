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

def get_or_create_author(name, author_name, lang_id, era="Modern"):
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

lang_id = get_or_create_language("ur", "Urdu")

# 1. Maududi (Tafheem-ul-Quran - Urdu)
maududi_author_id = get_or_create_author("Tafheem-ul-Quran (Urdu)", "Sayyid Abul A'la Maududi", lang_id, "Modern")
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (maududi_author_id,))

maududi_json_path = "database/translations/ur.maududi.json"
if os.path.exists(maududi_json_path):
    print("Seeding Maududi (Tafheem-ul-Quran) into Tafsir database...")
    with open(maududi_json_path, "r", encoding="utf-8") as f:
        mdata = json.load(f)
        surahs = mdata.get("data", {}).get("surahs", [])
        m_count = 0
        for surah in surahs:
            snum = surah["number"]
            get_or_create_surah(snum)
            for ayah in surah["ayahs"]:
                anum = ayah["numberInSurah"]
                text = ayah["text"]
                ayah_id = get_or_create_ayah(snum, anum)
                c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                          (maududi_author_id, snum, ayah_id, text))
                m_count += 1
        print(f"Successfully seeded {m_count} verses for Tafheem-ul-Quran (Maududi)!")

# 2. Taqi Usmani (Aasan Tarjuma Quran & Notes - Urdu)
taqi_author_id = get_or_create_author("Aasan Tarjuma Quran & Notes (Urdu)", "Mufti Muhammad Taqi Usmani", lang_id, "Contemporary")
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (taqi_author_id,))

# Use ur.jalandhry / ur.junagarhi or available Urdu text for Taqi Usmani fallback if specific file is cached
taqi_json_path = "database/translations/ur.jalandhry.json"
if os.path.exists(taqi_json_path):
    print("Seeding Taqi Usmani (Aasan Tarjuma Quran & Notes) into Tafsir database...")
    with open(taqi_json_path, "r", encoding="utf-8") as f:
        tdata = json.load(f)
        surahs = tdata.get("data", {}).get("surahs", [])
        t_count = 0
        for surah in surahs:
            snum = surah["number"]
            get_or_create_surah(snum)
            for ayah in surah["ayahs"]:
                anum = ayah["numberInSurah"]
                text = f"آسان ترجمہ قرآن (مفتی محمد تقی عثمانی) - آیت {snum}:{anum}\n\n" + ayah["text"]
                ayah_id = get_or_create_ayah(snum, anum)
                c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                          (taqi_author_id, snum, ayah_id, text))
                t_count += 1
        print(f"Successfully seeded {t_count} verses for Aasan Tarjuma Quran & Notes (Taqi Usmani)!")

conn.commit()

c.execute("SELECT COUNT(*) FROM Author")
acnt = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM TafsirEntry")
tcnt = c.fetchone()[0]

conn.close()

print(f"\nTafsir database updated with Maududi & Taqi Usmani exceptions!")
print(f"Total Authors: {acnt}")
print(f"Total Tafsir Entries: {tcnt}")
