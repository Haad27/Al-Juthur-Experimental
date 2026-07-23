import urllib.request
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://equranlibrary.com/tafseer/tafheemulquran/1/1"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        divs = re.findall(r'<div[^>]*class="[^"]*translation[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
        print("Tafheem divs count:", len(divs))
        for idx, d in enumerate(divs):
            clean = re.sub(r'<[^>]+>', ' ', d).strip()
            clean = re.sub(r'\s+', ' ', clean)
            print(f"Div {idx}: {clean}")

    url2 = "http://equranlibrary.com/tafseer/aasantarjumaquran/1/1"
    req2 = urllib.request.Request(url2, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req2) as resp2:
        html2 = resp2.read().decode('utf-8')
        divs2 = re.findall(r'<div[^>]*class="[^"]*translation[^"]*"[^>]*>(.*?)</div>', html2, re.DOTALL | re.IGNORECASE)
        print("\nAasan Tarjuma Quran divs count:", len(divs2))
        for idx, d in enumerate(divs2):
            clean = re.sub(r'<[^>]+>', ' ', d).strip()
            clean = re.sub(r'\s+', ' ', clean)
            print(f"Aasan Div {idx}: {clean}")

except Exception as e:
    print("Error:", e)
