import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

# Define pairs/lists of author IDs to remove and the primary author ID to keep
# Format: (primary_id_to_keep, [ids_to_remove], clean_display_name)

dedup_plan = [
    # Arabic
    (19, [46], "Tafsir as-Sa'di"),
    (26, [126], "Al-Mukhtasar fi Tafsir al-Quran"),
    
    # English
    (60, [130], "Abridged Explanation of the Quran (English)"),
    (129, [111], "Asbab al-Nuzul (Al-Wahidi English)"),
    (128, [108], "Lata'if al-Isharat (Tafsir al-Qushayri English)"),
    (63, [113, 127], "Tafsir al-Jalalayn (English)"),
    (131, [112], "Tanwir al-Miqbas (Tafsir Ibn 'Abbas English)"),
    (64, [132], "Tazkirul Quran (English)"),

    # Urdu
    (104, [135], "Bayan-ul-Quran (Urdu)"),
    (105, [137], "Fi Zilal al-Quran (Urdu)"),
    (102, [134], "Tafsir Ibn Kathir (Urdu)"),
    (103, [136], "Tafsir as-Sa'di (Urdu)"),
    (106, [133], "Tazkirul Quran (Urdu)"),

    # Russian
    (95, [98], "Tafsir as-Sa'di (Russian)")
]

total_deleted_authors = 0
total_deleted_entries = 0

print("Starting Tafsir Database Deduplication...")

for keep_id, remove_ids, clean_name in dedup_plan:
    # Update clean name for the primary author
    c.execute("UPDATE Author SET name = ? WHERE id = ?", (clean_name, keep_id))
    
    for rid in remove_ids:
        # Delete entries of redundant author
        c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (rid,))
        deleted_entries = c.rowcount
        total_deleted_entries += deleted_entries
        
        # Delete redundant author entry
        c.execute("DELETE FROM Author WHERE id = ?", (rid,))
        c.execute("DELETE FROM _AuthorToTag WHERE A = ?", (rid,))
        total_deleted_authors += 1
        
        print(f"Removed redundant Author ID {rid} (Deleted {deleted_entries} duplicate entries). Kept ID {keep_id} ('{clean_name}').")

conn.commit()

# Clean up orphaned tags if any
c.execute("DELETE FROM Tag WHERE id NOT IN (SELECT B FROM _AuthorToTag)")

c.execute("SELECT COUNT(*) FROM Author")
final_authors_count = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM TafsirEntry")
final_entries_count = c.fetchone()[0]

conn.close()

print(f"\nDeduplication Complete!")
print(f"Removed {total_deleted_authors} duplicate authors and {total_deleted_entries} duplicate Tafsir entries.")
print(f"Final Clean Unique Authors in DB: {final_authors_count}")
print(f"Final Total Tafsir Entries in DB: {final_entries_count}")
