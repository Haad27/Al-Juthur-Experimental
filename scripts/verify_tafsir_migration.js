import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  const langs = await prisma.language.findMany({
    include: {
      authors: {
        select: { id: true, name: true, authorName: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Verification: Total Languages = ${langs.length}`);
  const sample = ['French', 'Spanish', 'Chinese', 'Albanian', 'Hindi', 'Russian', 'Bengali', 'English', 'Arabic', 'Urdu'];
  for (const name of sample) {
    const l = langs.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (l) {
      console.log(`- ${l.name} (${l.code}): ${l.authors.map(a => `${a.name} [ID:${a.id}]`).join(', ')}`);
    } else {
      console.error(`- Missing language: ${name}`);
    }
  }

  const other = langs.find(x => x.name.toLowerCase().includes('other') || x.code === 'ot');
  if (other) {
    console.error('ERROR: "Other-Languages" still exists!');
  } else {
    console.log('SUCCESS: No "Other-Languages" bucket found.');
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
