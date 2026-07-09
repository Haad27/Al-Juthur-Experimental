import urllib.request
import os
import concurrent.futures

folders_to_extract = [
    "en-kashf-al-asrar-tafsir",
    "en-al-qushairi-tafsir",
    "en-kashani-tafsir",
    "en-tafsir-al-tustari",
    "en-asbab-al-nuzul-by-al-wahidi",
    "en-tafsir-ibn-abbas",
    "en-al-jalalayn"
]

dest_dir = "database/tafsir-database/english"
os.makedirs(dest_dir, exist_ok=True)

def download_file(url, target_path):
    try:
        urllib.request.urlretrieve(url, target_path)
        return f"Downloaded {target_path}"
    except Exception as e:
        return f"Failed {target_path}: {e}"

download_tasks = []

for folder in folders_to_extract:
    folder_path = os.path.join(dest_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Each tafsir has 114 json files for the 114 surahs
    for surah in range(1, 115):
        url = f"https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/{folder}/{surah}.json"
        target_path = os.path.join(folder_path, f"{surah}.json")
        download_tasks.append((url, target_path))

print(f"Starting {len(download_tasks)} concurrent downloads...")

# Download concurrently
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(download_file, task[0], task[1]) for task in download_tasks]
    for i, future in enumerate(concurrent.futures.as_completed(futures)):
        # print progress every 100 files
        if (i+1) % 100 == 0:
            print(f"Progress: {i+1}/{len(download_tasks)} files downloaded")

print("All specific Tafsir files downloaded successfully.")
