"""
build_sadi_english.py
Production builder: parses 10 volumes of Tafsir As-Sa'di (OCR DjVu text)
and writes 114 JSON files to database/downloaded_tafsirs/en-tafsir-as-saadi/

Run from the project root:
    python database/build_sadi_english.py
"""

import os
import re
import json

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
VOLUMES_DIR = "database/tmp/sadi_raw_txt"
OUTPUT_DIR  = "database/downloaded_tafsirs/en-tafsir-as-saadi"

SURAH_AYAH_COUNTS = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
    11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
    21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
    31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
    41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
    51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
    61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
    71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
    81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
    91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
    101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
    111: 5, 112: 4, 113: 5, 114: 6
}

# ---------------------------------------------------------------------------
# OCR cleaner — strips headers, footers, page numbers, Arabic OCR garbage
# ---------------------------------------------------------------------------
def clean_ocr(text: str) -> str:
    text = re.sub(r'(?i)sunniconnect\.com', '', text)
    text = re.sub(r"(?i)\d+\s*\|\s*Tafseer\s+as-Sa\s*['\u2019]?di.*", '', text)
    text = re.sub(r"(?i)Soorat\s+[A-Za-z\-'\s]+\s*(\([^)]*\))?\s*\|\s*\d+", '', text)
    text = re.sub(r'(?i)\d+\s*\|\s*Soorat.*', '', text)
    text = re.sub(r'(?i)Contents\s*\|\s*\d+', '', text)
    text = re.sub(r'(?i)Pronunciation\s+and\s+transliteration\s+chart.*', '', text)
    text = re.sub(r"(?i)This\s+is\s+the\s+end\s+of\s+the\s+commentary\s+on\s+Soorat\s+[A-Za-z\-'\s]+\..*", '', text)
    text = re.sub(r'(?m)^\s*\d+\s*$', '', text)
    text = re.sub(r'(?m)^[\s\u0600-\u06FF\(\)\-\:\.\,\^\*\;\/\d\~]{5,}\s*$', '', text)
    lines = [re.sub(r'[ \t]+', ' ', l).strip() for l in text.split('\n')]
    return '\n'.join(l for l in lines if l)


def parse_num(s: str):
    if not s:
        return None
    clean = re.sub(r'\s+', '', s)
    return int(clean) if clean.isdigit() else None


# ---------------------------------------------------------------------------
# Step 1 — Parse all 10 volumes, collect raw clusters
# ---------------------------------------------------------------------------
print("=" * 60)
print("Tafsir As-Sa'di English — Production Builder")
print("=" * 60)

# Regex matches: "5:116." / "5.116." / "5;116." / "1 06 : 1 ." etc.
MARKER_RE = re.compile(
    r'(?:^|[\r\n]|\b|[ \t])(\d[ \t\d]{0,4})\s*[:;\.]\s*(\d[ \t\d]{0,4})'
    r'(?:\s*[\-\–\—]\s*(\d[ \t\d]{0,4}))?\s*\.\s*'
)

all_clusters = []

for vol_idx in range(1, 11):
    vol_path = os.path.join(VOLUMES_DIR, f"vol_{vol_idx}.txt")
    print(f"\n[Vol {vol_idx}] Reading {vol_path} …")

    with open(vol_path, 'r', encoding='utf-8') as f:
        raw_text = f.read()

    # Skip Table of Contents (first ~12 000 chars)
    m_body = re.search(
        r'(?:^|\n)\s*(?:0?\d{1,3}\.\s*\n+\s*Soorat|(?:\d{1,3})\s*[:.]\s*1\s*\.)',
        raw_text[12000:]
    )
    body_start = (12000 + m_body.start()) if m_body else 15000
    body = raw_text[body_start:]

    matches = list(MARKER_RE.finditer(body))
    print(f"  -> {len(matches)} verse markers found (body_start={body_start})")

    entries = []
    for m in matches:
        s_num = parse_num(m.group(1))
        a_num = parse_num(m.group(2))
        end_a = parse_num(m.group(3)) if m.group(3) else a_num
        if s_num and a_num and 1 <= s_num <= 114 and 1 <= a_num <= 300:
            entries.append({
                'surah': s_num,
                'start_ayah': a_num,
                'end_ayah': end_a,
                'start_pos': m.start(),
                'end_pos': m.end(),
            })

    # Cluster consecutive verse listings before a commentary block
    current_cluster = []
    for i, curr in enumerate(entries):
        current_cluster.append(curr)

        if i == len(entries) - 1:
            comm = clean_ocr(body[curr['end_pos']:])
            all_clusters.append((current_cluster, comm))
            break

        nxt = entries[i + 1]
        between = clean_ocr(body[curr['end_pos']:nxt['start_pos']])
        is_consecutive = (
            nxt['surah'] == curr['surah'] and
            nxt['start_ayah'] == curr['end_ayah'] + 1
        )

        if curr['surah'] != nxt['surah'] or not is_consecutive or len(between) > 650:
            all_clusters.append((current_cluster, between))
            current_cluster = []

print(f"\nTotal clusters collected: {len(all_clusters)}")

# ---------------------------------------------------------------------------
# Step 2 — Build surah→ayah→text map
# ---------------------------------------------------------------------------
surah_ayah_map: dict[int, dict[int, str]] = {s: {} for s in range(1, 115)}

for cluster_verses, commentary in all_clusters:
    s = cluster_verses[0]['surah']
    start_a = cluster_verses[0]['start_ayah']
    end_a = cluster_verses[-1]['end_ayah']

    if not commentary or len(commentary) < 20:
        continue

    for a in range(start_a, end_a + 1):
        if 1 <= s <= 114:
            # Keep longest commentary when overlapping clusters hit the same ayah
            if a not in surah_ayah_map[s] or len(commentary) > len(surah_ayah_map[s][a]):
                surah_ayah_map[s][a] = commentary

# ---------------------------------------------------------------------------
# Step 3 — Gap interpolation (forward + backward fill)
#           As-Sa'di groups multiple ayahs under one commentary — all share it
# ---------------------------------------------------------------------------
for s in range(1, 115):
    count = SURAH_AYAH_COUNTS[s]
    # Forward fill
    last_text = None
    for a in range(1, count + 1):
        if a in surah_ayah_map[s]:
            last_text = surah_ayah_map[s][a]
        elif last_text is not None:
            surah_ayah_map[s][a] = last_text
    # Backward fill for ayahs before the first detected marker
    next_text = None
    for a in range(count, 0, -1):
        if a in surah_ayah_map[s]:
            next_text = surah_ayah_map[s][a]
        elif next_text is not None:
            surah_ayah_map[s][a] = next_text

# Coverage check
total_expected = sum(SURAH_AYAH_COUNTS.values())
total_covered  = sum(len(surah_ayah_map[s]) for s in range(1, 115))
pct = total_covered / total_expected * 100
print(f"\nCoverage: {total_covered} / {total_expected} ({pct:.2f}%)")
if total_covered < total_expected:
    for s in range(1, 115):
        missing = [a for a in range(1, SURAH_AYAH_COUNTS[s] + 1) if a not in surah_ayah_map[s]]
        if missing:
            print(f"  ⚠  Surah {s}: missing ayahs {missing[:10]}")

# ---------------------------------------------------------------------------
# Step 4 — Write 114 JSON files
# ---------------------------------------------------------------------------
os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"\nWriting JSON files to: {OUTPUT_DIR}")

for s in range(1, 115):
    count = SURAH_AYAH_COUNTS[s]
    records = []
    for a in range(1, count + 1):
        text = surah_ayah_map[s].get(a, "")
        records.append({"ayah": a, "surah": s, "text": text})

    out_path = os.path.join(OUTPUT_DIR, f"{s}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Surah {s:>3}  ({count} ayahs)  → {s}.json")

print("\n✅ Done! All 114 JSON files written.")
