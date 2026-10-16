const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

async function main() {
  const [langs, rawAuthors] = await Promise.all([
    prisma.language.findMany({ orderBy: { name: 'asc' } }),
    prisma.author.findMany({ include: { language: true, tags: true }, orderBy: { id: 'asc' } })
  ]);

  console.log(`Total Languages: ${langs.length}`);
  console.log(`Total DB Authors: ${rawAuthors.length}`);

  const output = rawAuthors.map(a => ({
    id: a.id,
    name: a.name,
    authorName: a.authorName,
    lang: a.language?.name,
    era: a.era,
    tags: a.tags.map(t => t.name)
  }));

  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, 'tafsirs_dump.json'), JSON.stringify(output, null, 2));
  console.log('Saved to scripts/tafsirs_dump.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
