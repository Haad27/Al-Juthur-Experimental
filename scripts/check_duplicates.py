import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

c.execute('''
    SELECT a.id, a.name, a.authorName, a.languageId, l.name, COUNT(te.id)
    FROM Author a
    JOIN Language l ON a.languageId = l.id
    LEFT JOIN TafsirEntry te ON te.authorId = a.id
    GROUP BY a.id
    ORDER BY a.languageId, a.name
''')

rows = c.fetchall()
by_lang = {}
for r in rows:
    lname = r[4]
    if lname not in by_lang: by_lang[lname] = []
    by_lang[lname].append(r)

for lname, items in by_lang.items():
    print(f"=== Language: {lname} ({len(items)} authors) ===")
    for r in items:
        print(f"  ID {r[0]}: \"{r[1]}\" ({r[2]}) -> {r[5]} entries")
conn.close()
