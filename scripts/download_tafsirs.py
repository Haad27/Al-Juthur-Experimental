import urllib.request
import zipfile
import os
import shutil

url = "https://github.com/spa5k/tafsir_api/archive/refs/heads/main.zip"
zip_path = "database/github_tafsir.zip"
extract_dir = "database/github_tafsir_tmp"
dest_dir = "database/tafsir-database/english"

folders_to_extract = [
    "en-kashf-al-asrar-tafsir",
    "en-al-qushairi-tafsir",
    "en-kashani-tafsir",
    "en-tafsir-al-tustari",
    "en-asbab-al-nuzul-by-al-wahidi",
    "en-tafsir-ibn-abbas",
    "en-al-jalalayn"
]

print("Downloading tafsir_api repo...")
urllib.request.urlretrieve(url, zip_path)

print("Extracting requested folders...")
os.makedirs(dest_dir, exist_ok=True)

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    for item in zip_ref.namelist():
        # item looks like "tafsir_api-main/tafsir/en-kashf-al-asrar-tafsir/1.json"
        parts = item.split('/')
        if len(parts) >= 3 and parts[1] == "tafsir" and parts[2] in folders_to_extract:
            # We want to extract it directly into dest_dir/folder_name/filename
            # But the zip has the structure tafsir_api-main/tafsir/folder/file
            # Let's extract it directly
            if not item.endswith('/'):
                folder_name = parts[2]
                filename = parts[-1]
                target_folder = os.path.join(dest_dir, folder_name)
                os.makedirs(target_folder, exist_ok=True)
                target_file = os.path.join(target_folder, filename)
                with zip_ref.open(item) as source, open(target_file, "wb") as target:
                    shutil.copyfileobj(source, target)

print("Extraction complete. Cleaning up...")
if os.path.exists(zip_path):
    os.remove(zip_path)

print("Successfully downloaded and extracted specific Tafsirs!")
