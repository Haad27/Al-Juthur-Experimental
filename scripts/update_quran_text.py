import sqlite3
import urllib.request
import json

db_path = "prisma/dev.db"
conn = sqlite3.connect(db_path, timeout=30.0)
c = conn.cursor()

print("Fetching authentic Quran Uthmani text and Surah metadata...")
url = "https://api.alquran.cloud/v1/quran/quran-uthmani"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))

surahs = data['data']['surahs']
print(f"Loaded {len(surahs)} Surahs from API. Batch updating database...")

surah_data = [(surah['name'], surah['englishName'], surah['number']) for surah in surahs]
ayah_data = []
for surah in surahs:
    for ayah in surah['ayahs']:
        ayah_data.append((ayah['text'], surah['number'], ayah['numberInSurah']))

c.execute("BEGIN TRANSACTION")
c.executemany("UPDATE Surah SET name = ?, englishName = ? WHERE id = ?", surah_data)
c.executemany("UPDATE Ayah SET text = ? WHERE surahId = ? AND numberInSurah = ?", ayah_data)
conn.commit()
conn.close()
print("Successfully updated 114 Surahs and 6236 Ayahs with authentic Uthmani Arabic!")
