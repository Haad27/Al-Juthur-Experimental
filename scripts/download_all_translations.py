import urllib.request
import json
import os
import time
import concurrent.futures

dest_dir = os.path.join("database", "translations")
os.makedirs(dest_dir, exist_ok=True)
manifest_path = os.path.join(dest_dir, "manifest.json")

print("1. Fetching full edition list from Al Quran Cloud...")
editions_url = "https://api.alquran.cloud/v1/edition?type=translation"

req = urllib.request.Request(editions_url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())

editions = data.get("data", [])
print(f"Found {len(editions)} translation editions.")

manifest = []
download_tasks = []

for ed in editions:
    identifier = ed.get("identifier")
    language = ed.get("language")
    name = ed.get("name")
    englishName = ed.get("englishName")
    
    file_path = os.path.join(dest_dir, f"{identifier}.json")
    
    # We include in manifest if downloaded or needs download
    manifest.append({
        "identifier": identifier,
        "language": language,
        "name": name,
        "englishName": englishName
    })

    if not os.path.exists(file_path) or os.path.getsize(file_path) < 100000: # smaller than 100KB is incomplete
        url = f"https://api.alquran.cloud/v1/quran/{identifier}"
        download_tasks.append((identifier, url, file_path))

with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f"Manifest saved with {len(manifest)} translations.")
print(f"Files remaining to download/retry: {len(download_tasks)}")

def download_with_retry(task):
    identifier, url, target_path = task
    max_retries = 5
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()
                parsed = json.loads(content.decode())
                if parsed.get("code") == 200 and len(parsed.get("data", {}).get("surahs", [])) == 114:
                    with open(target_path, "wb") as f:
                        f.write(content)
                    return True, f"OK: {identifier}"
        except Exception as e:
            time.sleep(1.5 * (attempt + 1))
    return False, f"FAILED: {identifier}"

if download_tasks:
    print("Downloading remaining files sequentially with retry logic...")
    success = 0
    for idx, task in enumerate(download_tasks):
        ok, msg = download_with_retry(task)
        if ok:
            success += 1
        if (idx + 1) % 5 == 0 or (idx + 1) == len(download_tasks):
            print(f"Downloaded {idx + 1}/{len(download_tasks)} (Success: {success})")
        time.sleep(0.3)

print("All available translations successfully fetched and stored!")
