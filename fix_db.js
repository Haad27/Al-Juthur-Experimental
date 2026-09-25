const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$queryRawUnsafe('ALTER TABLE UserHighlight ADD COLUMN authorName TEXT;');
    console.log('Added authorName');
  } catch (e) { console.log('authorName exists or error:', e.message); }
  
  try {
    await prisma.$queryRawUnsafe('ALTER TABLE UserHighlight ADD COLUMN color TEXT DEFAULT "gold";');
    console.log('Added color');
  } catch (e) { console.log('color exists or error:', e.message); }
}

main().finally(() => prisma.$disconnect());
