const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring Author 265 (English Tafsir as-Sa\'di) in database...');
  const existing = await prisma.author.findUnique({ where: { id: 265 } });
  if (existing) {
    console.log('Author 265 already exists:', existing);
    const updated = await prisma.author.update({
      where: { id: 265 },
      data: {
        name: "Tafsir as-Sa'di",
        authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di",
        languageId: 3,
        era: "Modern & Contemporary (19th-21st CE)"
      }
    });
    console.log('Updated Author 265:', updated);
  } else {
    const created = await prisma.author.create({
      data: {
        id: 265,
        name: "Tafsir as-Sa'di",
        authorName: "Shaykh Abdur-Rahman ibn Nasir as-Sa'di",
        languageId: 3,
        era: "Modern & Contemporary (19th-21st CE)"
      }
    });
    console.log('Created Author 265:', created);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
