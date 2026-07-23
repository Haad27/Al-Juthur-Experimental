import urllib.request
import re
import sys
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')

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
os.makedirs(f"{out_dir}/tafheemulquran", exist_ok=True)
os.makedirs(f"{out_dir}/aasantarjumaquran", exist_ok=True)

def fetch_verse_data(slug, snum, anum):
    dest = f"{out_dir}/{slug}/{snum}_{anum}.json"
    if os.path.exists(dest) and os.path.getsize(dest) > 20:
        with open(dest, "r", encoding="utf-8") as f:
            return json.load(f)

    url = f"http://equranlibrary.com/tafseer/{slug}/{snum}/{anum}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8')
            divs = re.findall(r'<div[^>]*class="[^"]*translation[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
            
            trans_text = ""
            tafsir_text = ""
            if len(divs) >= 2:
                trans_text = re.sub(r'<[^>]+>', ' ', divs[1]).strip()
                trans_text = re.sub(r'\s+', ' ', trans_text)
            if len(divs) >= 3:
                tafsir_text = re.sub(r'<[^>]+>', ' ', divs[2]).strip()
                tafsir_text = re.sub(r'\s+', ' ', tafsir_text)

            res = {"translation": trans_text, "tafsir": tafsir_text}
            with open(dest, "w", encoding="utf-8") as out:
                json.dump(res, out, ensure_ascii=False)
            return res
    except Exception as e:
        return {"translation": "", "tafsir": ""}

print("Downloading full Verse Translation + Footnote Commentaries for Maududi & Taqi Usmani...")

all_fetch_tasks = []
with ThreadPoolExecutor(max_workers=25) as executor:
    for s_idx, cnt in enumerate(SURAHS_AYAH_COUNT):
        snum = s_idx + 1
        for anum in range(1, cnt + 1):
            all_fetch_tasks.append(executor.submit(fetch_verse_data, "tafheemulquran", snum, anum))
            all_fetch_tasks.append(executor.submit(fetch_verse_data, "aasantarjumaquran", snum, anum))

for t in all_fetch_tasks:
    t.result()

print("Download complete! Seeding into database...")

# Clear existing entries for both authors to replace with combined Translation + Footnote Tafsir
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (maududi_author_id,))
c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (taqi_author_id,))

m_count = 0
t_count = 0

for s_idx, cnt in enumerate(SURAHS_AYAH_COUNT):
    snum = s_idx + 1
    get_or_create_surah(snum)
    for anum in range(1, cnt + 1):
        ayah_id = get_or_create_ayah(snum, anum)

        # Maududi
        m_file = f"{out_dir}/tafheemulquran/{snum}_{anum}.json"
        if os.path.exists(m_file):
            with open(m_file, "r", encoding="utf-8") as f:
                d = json.load(f)
                trans = d.get("translation", "").strip()
                tafsir = d.get("tafsir", "").strip()
                
                # Combine Translation & Footnote Commentary
                combined_text = ""
                if trans:
                    combined_text += f"<b class='text-emerald-400 block mb-2 font-bold'>تراجم: {trans}</b>\n\n"
                if tafsir:
                    combined_text += f"<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>حواشی و تفسیر:</b> {tafsir}</div>"
                
                if combined_text.strip():
                    c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                              (maududi_author_id, snum, ayah_id, combined_text))
                    m_count += 1

        # Taqi Usmani
        t_file = f"{out_dir}/aasantarjumaquran/{snum}_{anum}.json"
        if os.path.exists(t_file):
            with open(t_file, "r", encoding="utf-8") as f:
                d = json.load(f)
                trans = d.get("translation", "").strip()
                tafsir = d.get("tafsir", "").strip()

                # Combine Translation & Footnote Commentary
                combined_text = ""
                if trans:
                    combined_text += f"<b class='text-emerald-400 block mb-2 font-bold'>آسان ترجمہ: {trans}</b>\n\n"
                if tafsir:
                    combined_text += f"<div class='leading-relaxed text-zinc-200 mt-2'><b class='text-amber-400 block mb-1 font-bold'>حواشی و تفسیر:</b> {tafsir}</div>"

                if combined_text.strip():
                    c.execute("INSERT INTO TafsirEntry (authorId, surahId, ayahId, text) VALUES (?, ?, ?, ?)",
                              (taqi_author_id, snum, ayah_id, combined_text))
                    t_count += 1

conn.commit()

c.execute("SELECT COUNT(*) FROM Author")
acnt = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM TafsirEntry")
tcnt = c.fetchone()[0]

conn.close()

print(f"\nSuccessfully seeded combined Translation + Footnote Commentary into Tafsir database!")
print(f"Maududi (Tafheem-ul-Quran) entries: {m_count}")
print(f"Taqi Usmani (Aasan Tarjuma Quran) entries: {t_count}")
print(f"Total Authors in DB: {acnt}")
print(f"Total Tafsir Entries in DB: {tcnt}")
