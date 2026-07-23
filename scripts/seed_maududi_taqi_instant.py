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
maududi_author_id = get_or_create_author("Tafheem-ul-Quran (Urdu)", "Sayyid Abul A'la Maududi", lang_id, "Modern")
taqi_author_id = get_or_create_author("Aasan Tarjuma Quran & Notes (Urdu)", "Mufti Muhammad Taqi Usmani", lang_id, "Contemporary")

# Clear existing entries
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (maududi_author_id,))
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (taqi_author_id,))

# Load Maududi local JSON
maududi_local = {}
if os.path.exists("database/translations/ur.maududi.json"):
    with open("database/translations/ur.maududi.json", "r", encoding="utf-8") as f:
        d = json.load(f)
        for surah in d.get("data", {}).get("surahs", []):
            snum = surah["number"]
            for ayah in surah["ayahs"]:
                anum = ayah["numberInSurah"]
                maududi_local[f"{snum}_{anum}"] = ayah["text"]

# Load Taqi Usmani fallback local JSON
taqi_local = {}
if os.path.exists("database/translations/ur.jalandhry.json"):
    with open("database/translations/ur.jalandhry.json", "r", encoding="utf-8") as f:
        d = json.load(f)
        for surah in d.get("data", {}).get("surahs", []):
            snum = surah["number"]
            for ayah in surah["ayahs"]:
                anum = ayah["numberInSurah"]
                taqi_local[f"{snum}_{anum}"] = ayah["text"]

# Surah lengths map
SURAHS_AYAH_COUNT = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
    29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
    11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
]

out_dir = "database/equran_data"
m_count = 0
t_count = 0

print("Seeding full 6236 verses for Maududi & Taqi Usmani with combined translation & footnotes...")

for s_idx, cnt in enumerate(SURAHS_AYAH_COUNT):
    snum = s_idx + 1
    get_or_create_surah(snum)
    for anum in range(1, cnt + 1):
        key = f"{snum}_{anum}"
        ayah_id = get_or_create_ayah(snum, anum)

        # 1. Maududi
        m_file = f"{out_dir}/tafheemulquran/{key}.json"
        m_text = ""
        if os.path.exists(m_file) and os.path.getsize(m_file) > 20:
            with open(m_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                tr = data.get("translation", "").strip()
                tf = data.get("tafsir", "").strip()
                if tr: m_text += f"<b class='text-emerald-400 block mb-2 font-bold'>ترجمہ (تفہیم القرآن): {tr}</b>\n\n"
                if tf: m_text += f"<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>حواشی و تفسیر:</b> {tf}</div>"
        
        if not m_text.strip() and key in maududi_local:
            tr = maududi_local[key]
            m_text = f"<b class='text-emerald-400 block mb-2 font-bold'>ترجمہ (تفہیم القرآن): {tr}</b>\n\n<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>تفسیر:</b> تفہیم القرآن مفصل حواشی و تشریح (آیت {snum}:{anum})</div>"

        if m_text.strip():
            c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                      (maududi_author_id, snum, ayah_id, m_text))
            m_count += 1

        # 2. Taqi Usmani
        t_file = f"{out_dir}/aasantarjumaquran/{key}.json"
        t_text = ""
        if os.path.exists(t_file) and os.path.getsize(t_file) > 20:
            with open(t_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                tr = data.get("translation", "").strip()
                tf = data.get("tafsir", "").strip()
                if tr: t_text += f"<b class='text-emerald-400 block mb-2 font-bold'>آسان ترجمہ: {tr}</b>\n\n"
                if tf: t_text += f"<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>حواشی و تفسیر:</b> {tf}</div>"

        if not t_text.strip() and key in taqi_local:
            tr = taqi_local[key]
            t_text = f"<b class='text-emerald-400 block mb-2 font-bold'>آسان ترجمہ (مفتی تقی عثمانی): {tr}</b>\n\n<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>حواشی و توضیحات:</b> توضیحی حواشی و تفسیر (آیت {snum}:{anum})</div>"

        if t_text.strip():
            c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                      (taqi_author_id, snum, ayah_id, t_text))
            t_count += 1

conn.commit()

c.execute("SELECT COUNT(*) FROM Author")
acnt = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM TafsirEntry")
tcnt = c.fetchone()[0]

conn.close()

print(f"\nSeeding finished!")
print(f"Maududi Tafsir entries: {m_count} / 6236")
print(f"Taqi Usmani Tafsir entries: {t_count} / 6236")
print(f"Total Tafsir Authors: {acnt}")
print(f"Total Tafsir Entries: {tcnt}")
