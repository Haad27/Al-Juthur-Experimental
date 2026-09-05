import os
import gzip
import json
import urllib.request
import sqlite3
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

# 1. Connect to dev.db to get ayah counts per surah
conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute("SELECT surahId, COUNT(*) FROM Ayah GROUP BY surahId ORDER BY surahId")
surah_ayah_counts = dict(c.fetchall())

# Ensure Tag table has required tags and get IDs
TAGS_MAP = {
    "Athari / Riwayah": 1,
    "Linguistic & Rhetoric": 2,
    "Legal / Fiqhi": 3,
    "Sufi / Ishari": 4,
    "Modern Comprehensive": 5,
    "Abridged / Translation": 6
}

# 2. Target Tafsirs configuration
TARGET_TAFSIRS = [
    {
        "id": 201,
        "book_id": "263",
        "slug": "ar-tafsir-al-manar",
        "name": "Tafsir al-Manar (تفسير المنار)",
        "authorName": "Muhammad Rashid Rida",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive"],
    },
    {
        "id": 202,
        "book_id": "27803",
        "slug": "ar-tafsir-al-shaarawi",
        "name": "Tafsir al-Sha'rawi (تفسير الشعراوي)",
        "authorName": "Shaykh Muhammad Metwalli al-Sha'rawi",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive"],
    },
    {
        "id": 203,
        "book_id": "306",
        "slug": "ar-al-tafsir-al-munir",
        "name": "Al-Tafsir al-Munir (التفسير المنير)",
        "authorName": "Dr. Wahbah al-Zuhayli",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive", "Legal / Fiqhi"],
    },
    {
        "id": 204,
        "book_id": "70",
        "slug": "ar-al-tafsir-al-wasit-zuhayli",
        "name": "Al-Tafsir al-Wasit (الوسيط للزحيلي)",
        "authorName": "Dr. Wahbah al-Zuhayli",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive"],
    },
    {
        "id": 205,
        "book_id": "160",
        "slug": "ar-safwat-al-tafasir",
        "name": "Safwat al-Tafasir (صفوة التفاسير)",
        "authorName": "Shaykh Muhammad Ali al-Sabuni",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive", "Abridged / Translation"],
    },
    {
        "id": 206,
        "book_id": "521",
        "slug": "ar-mukhtasar-ibn-kathir-sabuni",
        "name": "Mukhtasar Ibn Kathir (مختصر تفسير ابن كثير)",
        "authorName": "Shaykh Muhammad Ali al-Sabuni",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Athari / Riwayah", "Abridged / Translation"],
    },
    {
        "id": 207,
        "book_id": "334",
        "slug": "ar-tafsir-al-maraghi",
        "name": "Tafsir al-Maraghi (تفسير المراغي)",
        "authorName": "Ahmad Mustafa al-Maraghi",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive", "Linguistic & Rhetoric"],
    },
    {
        "id": 208,
        "book_id": "330",
        "slug": "ar-al-tafsir-al-hadith",
        "name": "Al-Tafsir al-Hadith (التفسير الحديث)",
        "authorName": "Muhammad Izzat Darwaza",
        "era": "Modern & Contemporary (19th-21st CE)",
        "tags": ["Modern Comprehensive"],
    },
    {
        "id": 209,
        "book_id": "336",
        "slug": "ar-ruh-al-bayan",
        "name": "Ruh al-Bayan (روح البيان)",
        "authorName": "Ismail Haqqi al-Burusawi",
        "era": "Post-Classical (15th-18th CE)",
        "tags": ["Sufi / Ishari", "Linguistic & Rhetoric"],
    },
    {
        "id": 210,
        "book_id": "313",
        "slug": "ar-al-kashf-wal-bayan-thalabi",
        "name": "Al-Kashf wal-Bayan (تفسير الثعلبي)",
        "authorName": "Abu Ishaq al-Tha'labi",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 211,
        "book_id": "507",
        "slug": "ar-lubab-al-tawil-khazin",
        "name": "Lubab al-Ta'wil (تفسير الخازن)",
        "authorName": "Ali ibn Muhammad al-Khazin",
        "era": "Medieval (11th-14th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 212,
        "book_id": "27773",
        "slug": "ar-ahkam-al-quran-jassas",
        "name": "Ahkam al-Quran (أحكام القرآن للجصاص)",
        "authorName": "Abu Bakr al-Jassas",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Legal / Fiqhi"],
    },
    {
        "id": 213,
        "book_id": "27780",
        "slug": "ar-ahkam-al-quran-ibn-al-arabi",
        "name": "Ahkam al-Quran (أحكام القرآن لابن العربي)",
        "authorName": "Abu Bakr ibn al-Arabi al-Maliki",
        "era": "Medieval (11th-14th CE)",
        "tags": ["Legal / Fiqhi"],
    },
    {
        "id": 214,
        "book_id": "27778",
        "slug": "ar-ahkam-al-quran-harrasi",
        "name": "Ahkam al-Quran (أحكام القرآن للهراسي)",
        "authorName": "Imam Ilkiya al-Harrasi",
        "era": "Medieval (11th-14th CE)",
        "tags": ["Legal / Fiqhi"],
    },
    {
        "id": 215,
        "book_id": "468",
        "slug": "ar-tawilat-ahl-al-sunnah-maturidi",
        "name": "Ta'wilat Ahl al-Sunnah (تفسير الماتريدي)",
        "authorName": "Abu Mansur al-Maturidi",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Linguistic & Rhetoric"],
    },
    {
        "id": 216,
        "book_id": "27789",
        "slug": "ar-al-bahr-al-madid-ibn-ajiba",
        "name": "Al-Bahr al-Madid (البحر المديد لابن عجيبة)",
        "authorName": "Ahmad ibn Ajiba",
        "era": "Post-Classical (15th-18th CE)",
        "tags": ["Sufi / Ishari"],
    },
    {
        "id": 217,
        "book_id": "27755",
        "slug": "ar-tafsir-muqatil-ibn-sulayman",
        "name": "Tafsir Muqatil ibn Sulayman (تفسير مقاتل بن سليمان)",
        "authorName": "Muqatil ibn Sulayman",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 218,
        "book_id": "269",
        "slug": "ar-tafsir-mujahid",
        "name": "Tafsir Mujahid (تفسير مجاهد بن جبر)",
        "authorName": "Imam Mujahid ibn Jabr",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 219,
        "book_id": "27765",
        "slug": "ar-tafsir-imam-malik",
        "name": "Tafsir al-Imam Malik (تفسير الإمام مالك)",
        "authorName": "Imam Malik ibn Anas",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah", "Legal / Fiqhi"],
    },
    {
        "id": 220,
        "book_id": "27767",
        "slug": "ar-tafsir-imam-al-shafii",
        "name": "Tafsir al-Imam al-Shafi'i (تفسير الإمام الشافعي)",
        "authorName": "Imam Muhammad ibn Idris al-Shafi'i",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Legal / Fiqhi", "Athari / Riwayah"],
    },
    {
        "id": 221,
        "book_id": "27759",
        "slug": "ar-tafsir-al-nasai",
        "name": "Tafsir al-Nasa'i (تفسير النسائي)",
        "authorName": "Imam Ahmad ibn Shu'ayb al-Nasa'i",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 222,
        "book_id": "367",
        "slug": "ar-al-hidayah-makki",
        "name": "Al-Hidayah ila Bulugh al-Nihayah (الهداية لمكي)",
        "authorName": "Imam Makki ibn Abi Talib",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Linguistic & Rhetoric"],
    },
    {
        "id": 223,
        "book_id": "27757",
        "slug": "ar-hashiyat-al-sawi",
        "name": "Hashiyat al-Sawi (حاشية الصاوي على الجلالين)",
        "authorName": "Ahmad ibn Muhammad al-Sawi",
        "era": "Post-Classical (15th-18th CE)",
        "tags": ["Linguistic & Rhetoric", "Modern Comprehensive"],
    },
    {
        "id": 224,
        "book_id": "27758",
        "slug": "ar-tafsir-sufyan-al-thawri",
        "name": "Tafsir Sufyan al-Thawri (تفسير سفيان الثوري)",
        "authorName": "Imam Sufyan al-Thawri",
        "era": "Early Classical (7th-10th CE)",
        "tags": ["Athari / Riwayah"],
    },
    {
        "id": 225,
        "book_id": "337",
        "slug": "ar-gharaib-al-quran-naysaburi",
        "name": "Ghara'ib al-Quran (غرائب القرآن للنيسابوري)",
        "authorName": "Nizam al-Din al-Naysaburi",
        "era": "Medieval (11th-14th CE)",
        "tags": ["Linguistic & Rhetoric", "Sufi / Ishari"],
    }
]

cache_dir = os.path.join("database", "tmp_gz_dumps")
os.makedirs(cache_dir, exist_ok=True)

print(f"=== Starting Quranpedia Download & Conversion Pipeline for {len(TARGET_TAFSIRS)} Tafsirs ===")

for idx, t in enumerate(TARGET_TAFSIRS, 1):
    bid = t["book_id"]
    slug = t["slug"]
    name = t["name"]
    out_dir = os.path.join("database", "downloaded_tafsirs", slug)
    os.makedirs(out_dir, exist_ok=True)
    
    gz_path = os.path.join(cache_dir, f"tafsir-book-{bid}.json.gz")
    url = f"https://quranpedia.net/dumps/tafsir-book-{bid}.json.gz"
    
    # Check if all 114 surah files already exist
    all_exist = all(os.path.exists(os.path.join(out_dir, f"{s}.json")) for s in range(1, 115))
    if all_exist and os.path.getsize(os.path.join(out_dir, "1.json")) > 10:
        print(f"[{idx}/{len(TARGET_TAFSIRS)}] Already processed: {name} ({slug}) -> Skipping download")
    else:
        # Download if not cached
        if not os.path.exists(gz_path) or os.path.getsize(gz_path) < 1000:
            print(f"[{idx}/{len(TARGET_TAFSIRS)}] Downloading {name} ({bid})...")
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = resp.read()
                    with open(gz_path, "wb") as f_out:
                        f_out.write(data)
                print(f"    Saved {len(data) / (1024*1024):.2f} MB to {gz_path}")
            except Exception as e:
                print(f"    ERROR downloading {url}: {e}")
                continue
        else:
            print(f"[{idx}/{len(TARGET_TAFSIRS)}] Using cached archive for {name} ({bid})")
            
        # Parse and decompress
        print(f"    Decompressing and grouping ayahs...")
        try:
            with gzip.open(gz_path, "rt", encoding="utf-8") as f_gz:
                raw_json = json.load(f_gz)
        except Exception as e:
            print(f"    ERROR reading {gz_path}: {e}")
            continue

        ayah_entries = raw_json.get("ayahs", [])
        print(f"    Total commented ayahs: {len(ayah_entries)}")

        surah_ayahs = {s: {} for s in range(1, 115)}
        for entry in ayah_entries:
            s = entry.get('surah')
            a = entry.get('ayah')
            if not s or not a:
                continue
            content_list = entry.get('content', [])
            texts = [item.get('text', '') for item in content_list if item.get('text')]
            combined_text = "\n\n".join(texts).strip()
            if combined_text:
                surah_ayahs[s][a] = combined_text

        # Write 1.json to 114.json
        total_written = 0
        for s in range(1, 115):
            max_ayah = surah_ayah_counts.get(s, 0)
            surah_data = []
            for a in range(1, max_ayah + 1):
                txt = surah_ayahs[s].get(a, "")
                surah_data.append({
                    "surah": s,
                    "ayah": a,
                    "text": txt
                })
                if txt:
                    total_written += 1
            
            with open(os.path.join(out_dir, f"{s}.json"), "w", encoding="utf-8") as f:
                json.dump(surah_data, f, ensure_ascii=False, indent=2)
                
        print(f"    Successfully generated 114 Surah JSON files ({total_written} active verses).")

    # 3. Register Author and Tags in dev.db
    aid = t["id"]
    aname = t["name"]
    author_name = t["authorName"]
    era = t["era"]
    
    # Check if author exists
    c.execute("SELECT id FROM Author WHERE id = ?", (aid,))
    row = c.fetchone()
    if not row:
        c.execute("""
            INSERT INTO Author (id, name, authorName, languageId, era)
            VALUES (?, ?, ?, 1, ?)
        """, (aid, aname, author_name, era))
    else:
        c.execute("""
            UPDATE Author SET name = ?, authorName = ?, era = ? WHERE id = ?
        """, (aname, author_name, era, aid))

    # Link tags
    for tag_name in t.get("tags", []):
        tid = TAGS_MAP.get(tag_name)
        if tid:
            c.execute("""
                INSERT OR IGNORE INTO _AuthorToTag (A, B) VALUES (?, ?)
            """, (aid, tid))

conn.commit()
conn.close()

print("\n=== All 25 Tafsirs Processed and Registered Successfully in dev.db! ===")
