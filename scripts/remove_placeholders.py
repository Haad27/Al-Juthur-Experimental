import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

placeholder_ids = [115, 116, 117, 118, 119, 120, 121, 122, 123, 124]

print(f"Removing {len(placeholder_ids)} placeholder authors that lack full verse-by-verse content...")

for pid in placeholder_ids:
    c.execute("DELETE FROM TafsirEntry WHERE authorId = ?", (pid,))
    c.execute("DELETE FROM Author WHERE id = ?", (pid,))
    c.execute("DELETE FROM _AuthorToTag WHERE A = ?", (pid,))

conn.commit()

c.execute("SELECT COUNT(*) FROM Author")
authors_count = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM TafsirEntry")
entries_count = c.fetchone()[0]

conn.close()

print(f"\nCleanup complete!")
print(f"Final Complete Authors Count: {authors_count}")
print(f"Final Total Tafsir Entries Count: {entries_count}")
