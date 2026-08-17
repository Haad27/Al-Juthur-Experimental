import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';
dotenv.config();

function getPrismaInstances() {
  const instances = [];

  // Local SQLite instance
  instances.push({
    name: 'Local SQLite (dev.db)',
    prisma: new PrismaClient(),
  });

  // Turso LibSQL instance if configured
  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    instances.push({
      name: 'Turso Cloud LibSQL',
      prisma: new PrismaClient({ adapter }),
    });
  }

  return instances;
}

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

async function migrateDatabase(dbName, prisma) {
  console.log(`\n==================================================`);
  console.log(`Migrating: ${dbName}`);
  console.log(`==================================================`);

  // 1. Standardize existing languages
  console.log('1. Standardizing existing languages...');
  const english = await prisma.language.findFirst({ where: { code: 'en' } });
  if (english && english.name !== 'English') {
    await prisma.language.update({ where: { id: english.id }, data: { name: 'English' } });
    console.log('  Updated English casing');
  }

  const bengali = await prisma.language.findFirst({ where: { name: 'Bengali' } });
  if (bengali && bengali.code !== 'bn') {
    await prisma.language.update({ where: { id: bengali.id }, data: { code: 'bn' } });
    console.log('  Updated Bengali code to "bn"');
  }

  const indonesian = await prisma.language.findFirst({ where: { name: 'Indonesian' } });
  if (indonesian && indonesian.code !== 'id') {
    await prisma.language.update({ where: { id: indonesian.id }, data: { code: 'id' } });
    console.log('  Updated Indonesian code to "id"');
  }

  const persian = await prisma.language.findFirst({ where: { name: 'Persian' } });
  if (persian && persian.code !== 'fa') {
    await prisma.language.update({ where: { id: persian.id }, data: { code: 'fa' } });
    console.log('  Updated Persian code to "fa"');
  }

  const turkish = await prisma.language.findFirst({ where: { name: 'Turkish' } });
  if (turkish && turkish.code !== 'tr') {
    await prisma.language.update({ where: { id: turkish.id }, data: { code: 'tr' } });
    console.log('  Updated Turkish code to "tr"');
  }

  // 2. Create new languages and reassign authors
  console.log('\n2. Creating new languages & reassigning authors...');
  for (const def of LANGUAGE_DEFINITIONS) {
    let lang = await prisma.language.findFirst({
      where: {
        OR: [
          { code: def.code },
          { name: def.name }
        ]
      }
    });

    if (!lang) {
      lang = await prisma.language.create({
        data: { code: def.code, name: def.name }
      });
      console.log(`  Created Language: ${lang.name} (${lang.code}) -> ID: ${lang.id}`);
    } else {
      if (lang.name !== def.name || lang.code !== def.code) {
        lang = await prisma.language.update({
          where: { id: lang.id },
          data: { code: def.code, name: def.name }
        });
      }
      console.log(`  Existing Language: ${lang.name} (${lang.code}) -> ID: ${lang.id}`);
    }

    for (const authorId of def.authorIds) {
      try {
        await prisma.author.update({
          where: { id: authorId },
          data: { languageId: lang.id },
        });
        console.log(`    Reassigned Author ID ${authorId} to ${lang.name}`);
      } catch (err) {
        console.warn(`    Could not update Author ID ${authorId}:`, err.message);
      }
    }
  }

  // 3. Remove obsolete "Other-Languages" entry
  console.log('\n3. Cleaning up obsolete "Other-Languages"...');
  const otherLangs = await prisma.language.findMany({
    where: {
      OR: [
        { code: 'ot' },
        { name: 'Other-Languages' },
        { name: 'Other Languages' }
      ]
    },
    include: { authors: true }
  });

  for (const other of otherLangs) {
    if (other.authors.length === 0) {
      await prisma.language.delete({ where: { id: other.id } });
      console.log(`  Deleted obsolete language record "${other.name}" (ID: ${other.id})`);
    } else {
      console.warn(`  Warning: "${other.name}" (ID: ${other.id}) still has ${other.authors.length} authors:`, other.authors.map(a => a.name));
    }
  }

  // 4. Verification
  const allLangs = await prisma.language.findMany({
    include: {
      authors: {
        select: { id: true, name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`\nVerification on ${dbName}: Total Languages = ${allLangs.length}`);
  allLangs.forEach(l => {
    console.log(`  - [${l.code}] ${l.name}: ${l.authors.length} authors`);
  });
}

async function main() {
  const dbs = getPrismaInstances();
  for (const db of dbs) {
    try {
      await migrateDatabase(db.name, db.prisma);
    } catch (err) {
      console.error(`Migration error on ${db.name}:`, err);
    } finally {
      await db.prisma.$disconnect();
    }
  }
}

main().catch(console.error);
