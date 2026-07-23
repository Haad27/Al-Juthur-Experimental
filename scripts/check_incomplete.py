import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

c.execute('''
    SELECT a.id, a.name, a.authorName, l.name, COUNT(te.id)
    FROM Author a
    JOIN Language l ON a.languageId = l.id
    LEFT JOIN TafsirEntry te ON te.authorId = a.id
    GROUP BY a.id
    ORDER BY COUNT(te.id) ASC
''')

rows = c.fetchall()
less_cnt = 0
for r in rows:
    if r[4] < 6000:
        less_cnt += 1
        print(f"ID {r[0]} ({r[3]}): \"{r[1]}\" ({r[2]}) -> {r[4]} entries")

print(f"\nTotal authors with less than 6000 entries: {less_cnt}")
conn.close()
