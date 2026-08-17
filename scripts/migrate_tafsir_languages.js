import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LANGUAGE_DEFINITIONS = [
  { code: 'as', name: 'Assamese', authorIds: [70] },
  { code: 'az', name: 'Azerbaijani', authorIds: [71] },
  { code: 'bs', name: 'Bosnian', authorIds: [72] },
  { code: 'zh', name: 'Chinese', authorIds: [73] },
  { code: 'fr', name: 'French', authorIds: [74, 75] },
  { code: 'ff', name: 'Fulani', authorIds: [76] },
  { code: 'hi', name: 'Hindi', authorIds: [77] },
  { code: 'it', name: 'Italian', authorIds: [78] },
  { code: 'ja', name: 'Japanese', authorIds: [79] },
  { code: 'km', name: 'Khmer', authorIds: [80] },
  { code: 'ky', name: 'Kyrgyz', authorIds: [81] },
  { code: 'ml', name: 'Malayalam', authorIds: [82] },
  { code: 'sr', name: 'Serbian', authorIds: [83] },
  { code: 'si', name: 'Sinhala', authorIds: [84] },
  { code: 'es', name: 'Spanish', authorIds: [85] },
  { code: 'sq', name: 'Albanian', authorIds: [86] },
  { code: 'tl', name: 'Tagalog', authorIds: [87] },
  { code: 'ta', name: 'Tamil', authorIds: [88] },
  { code: 'te', name: 'Telugu', authorIds: [89] },
  { code: 'th', name: 'Thai', authorIds: [90] },
  { code: 'ug', name: 'Uyghur', authorIds: [91] },
  { code: 'uz', name: 'Uzbek', authorIds: [92] },
  { code: 'vi', name: 'Vietnamese', authorIds: [93] },
];

async function main() {
  console.log('--- Starting Tafsir Language Migration ---');

  // 1. Clean up / standardize existing languages
  console.log('1. Standardizing existing languages...');
  
  // English
  const english = await prisma.language.findFirst({ where: { code: 'en' } });
  if (english && english.name !== 'English') {
    await prisma.language.update({
      where: { id: english.id },
      data: { name: 'English' }
    });
    console.log('  Updated English name casing to "English"');
  }

  // Bengali (be -> bn)
  const bengali = await prisma.language.findFirst({ where: { name: 'Bengali' } });
  if (bengali && bengali.code !== 'bn') {
    await prisma.language.update({
      where: { id: bengali.id },
      data: { code: 'bn' }
    });
    console.log('  Updated Bengali code to "bn"');
  }

  // Indonesian (in -> id)
  const indonesian = await prisma.language.findFirst({ where: { name: 'Indonesian' } });
  if (indonesian && indonesian.code !== 'id') {
    await prisma.language.update({
      where: { id: indonesian.id },
      data: { code: 'id' }
    });
    console.log('  Updated Indonesian code to "id"');
  }

  // Persian (pe -> fa)
  const persian = await prisma.language.findFirst({ where: { name: 'Persian' } });
  if (persian && persian.code !== 'fa') {
    await prisma.language.update({
      where: { id: persian.id },
      data: { code: 'fa' }
    });
    console.log('  Updated Persian code to "fa"');
  }

  // Turkish (tu -> tr)
  const turkish = await prisma.language.findFirst({ where: { name: 'Turkish' } });
  if (turkish && turkish.code !== 'tr') {
    await prisma.language.update({
      where: { id: turkish.id },
      data: { code: 'tr' }
    });
    console.log('  Updated Turkish code to "tr"');
  }

  // 2. Create new languages and reassign authors
  console.log('\n2. Creating new languages & reassigning authors...');
  for (const def of LANGUAGE_DEFINITIONS) {
    const lang = await prisma.language.upsert({
      where: { code: def.code },
      update: { name: def.name },
      create: { code: def.code, name: def.name }
    });

    console.log(`  Language: ${lang.name} (${lang.code}) -> ID: ${lang.id}`);

    for (const authorId of def.authorIds) {
      await prisma.author.update({
        where: { id: authorId },
        data: { languageId: lang.id }
      });
      console.log(`    Reassigned Author ID ${authorId} to ${lang.name}`);
    }
  }

  // 3. Remove obsolete "Other-Languages" entry if no authors remain
  console.log('\n3. Cleaning up obsolete "Other-Languages"...');
  const otherLang = await prisma.language.findFirst({
    where: {
      OR: [
        { code: 'ot' },
        { name: 'Other-Languages' }
      ]
    },
    include: { authors: true }
  });

  if (otherLang) {
    if (otherLang.authors.length === 0) {
      await prisma.language.delete({
        where: { id: otherLang.id }
      });
      console.log(`  Successfully deleted obsolete language record "${otherLang.name}" (ID: ${otherLang.id})`);
    } else {
      console.warn(`  Warning: "Other-Languages" still has ${otherLang.authors.length} authors:`, otherLang.authors.map(a => a.name));
    }
  }

  // 4. Final verification
  console.log('\n--- Final Verification ---');
  const allLangs = await prisma.language.findMany({
    include: {
      authors: {
        select: { id: true, name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Total Languages in DB: ${allLangs.length}`);
  const totalAuthors = allLangs.reduce((sum, l) => sum + l.authors.length, 0);
  console.log(`Total Authors assigned across all languages: ${totalAuthors}`);
  allLangs.forEach(l => {
    console.log(`  [${l.code.padEnd(3)}] ${l.name.padEnd(16)} : ${l.authors.length} Tafsirs`);
  });
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
