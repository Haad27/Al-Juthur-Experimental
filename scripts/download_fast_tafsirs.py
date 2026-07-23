import urllib.request
import json
import os
import sqlite3
from concurrent.futures import ThreadPoolExecutor

target_folders = [
    "ar-tafseer-tanwir-al-miqbas",
    "ar-tafsir-al-mukhtasar",
    "en-al-jalalayn",
    "en-al-qushairi-tafsir",
    "en-asbab-al-nuzul-by-al-wahidi",
    "en-kashani-tafsir",
    "en-kashf-al-asrar-tafsir",
    "en-tafsir-al-mukhtasar",
    "en-tafsir-al-tustari",
    "en-tafsir-ibn-abbas",
    "en-tazkirul-quran",
    "ur-tazkirul-quran",
    "ur-tafseer-ibn-e-kaseer",
    "ur-tafsir-bayan-ul-quran",
    "ur-tafsir-as-saadi-urdu",
    "tafsir-fe-zalul-quran-syed-qatab"
]

base_dest = "database/downloaded_tafsirs"
os.makedirs(base_dest, exist_ok=True)

def download_surah(folder, surah):
    dest_dir = os.path.join(base_dest, folder)
    os.makedirs(dest_dir, exist_ok=True)
    fpath = os.path.join(dest_dir, f"{surah}.json")
    if os.path.exists(fpath) and os.path.getsize(fpath) > 50:
        return
    url = f"https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/{folder}/{surah}.json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp, open(fpath, 'wb') as out:
            out.write(resp.read())
    except Exception as e:
        pass

print("Starting parallel download for missing full Tafsir datasets...")
tasks = []
with ThreadPoolExecutor(max_workers=20) as executor:
    for folder in target_folders:
        for surah in range(1, 115):
            tasks.append(executor.submit(download_surah, folder, surah))

for t in tasks:
    t.result()

print("Parallel download completed!")
