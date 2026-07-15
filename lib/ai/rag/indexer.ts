import prisma from '../../prisma';
import { indexParentDocumentWithChildren } from './chunker';
import { clearRagIndex, getRagDb } from './db';
import { getDictionaries, getLexiconEntriesForRoot } from '../../lexicon/service';

/**
 * Indexes sample classical dataset into RAG engine:
 * - Tafsir Ibn Kathir (En) -> Author ID 61
 * - Tafsir Jalalayn (Ar)   -> Author ID 52
 * - Lane's Lexicon         -> Dict ID 1 (en)
 * - Lisan al-Arab          -> Dict ID 2 (ar)
 */
export async function seedSampleRagIndex(options?: {
  maxSurahs?: number;
  sampleRoots?: string[];
}): Promise<{
  tafsirIndexed: number;
  lexiconIndexed: number;
}> {
  const maxSurahs = options?.maxSurahs || 2; // Default Surahs 1 & 2 for quick testing
  const sampleRoots = options?.sampleRoots || [
    'حمد',
    'صبر',
    'علم',
    'عبد',
    'ربب',
    'رحم',
    'ملك',
    'هدي',
    'نور',
    'كتب',
  ];

  console.log('Clearing existing RAG index...');
  clearRagIndex();

  let tafsirCount = 0;
  let lexiconCount = 0;

  // 1. Index Tafsir Ibn Kathir (English - ID 61) and Jalalayn (Arabic - ID 52)
  console.log(`Indexing Tafsir entries for Surahs 1 to ${maxSurahs}...`);
  const tafsirEntries = await prisma.tafsirEntry.findMany({
    where: {
      authorId: { in: [61, 52] },
      surahId: { lte: maxSurahs },
    },
    include: {
      author: true,
      surah: true,
      ayah: true,
    },
  });

  for (const entry of tafsirEntries) {
    if (!entry.text || entry.text.trim().length === 0) continue;

    const docId = `tafsir-${entry.authorId}-${entry.surahId}-${entry.ayah.numberInSurah}`;
    const authorName = entry.authorId === 61 ? 'Ibn Kathir' : 'Al-Jalalayn';
    const workTitle = entry.authorId === 61 ? 'Tafsir Ibn Kathir (English)' : 'Tafsir Al-Jalalayn (Arabic)';
    const lang = entry.authorId === 61 ? 'en' : 'ar';

    await indexParentDocumentWithChildren({
      id: docId,
      workType: 'tafsir',
      authorId: entry.authorId,
      authorName,
      workTitle,
      language: lang,
      surahId: entry.surahId,
      ayahId: entry.ayah.numberInSurah,
      rootWord: null,
      content: entry.text,
    });
    tafsirCount++;
  }

  // 2. Index Lexicon entries for sample roots (Lane's Lexicon + Lisan al-Arab)
  console.log(`Indexing Lexicon roots: ${sampleRoots.join(', ')}...`);
  for (const root of sampleRoots) {
    const lexResult = getLexiconEntriesForRoot(root);

    // Index Lane's Lexicon & Lisan al-Arab entries
    for (const entry of lexResult.entries) {
      if (![1, 2].includes(entry.dictId)) continue; // 1 = Lane, 2 = Lisan al-Arab
      const fullContent = entry.definitions
        .map((d) => d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .join('\n\n');

      if (!fullContent || fullContent.length === 0) continue;

      const docId = `lexicon-${entry.dictIdent}-${root}`;
      await indexParentDocumentWithChildren({
        id: docId,
        workType: 'lexicon',
        authorId: entry.dictId,
        authorName: entry.dictName,
        workTitle: entry.dictName,
        language: entry.isEnglish ? 'en' : 'ar',
        surahId: null,
        ayahId: null,
        rootWord: root,
        content: fullContent,
      });
      lexiconCount++;
    }
  }

  console.log(`Finished indexing! Indexed ${tafsirCount} Tafsir entries and ${lexiconCount} Lexicon entries.`);
  return {
    tafsirIndexed: tafsirCount,
    lexiconIndexed: lexiconCount,
  };
}

// Allow running via CLI CLI
if (require.main === module) {
  seedSampleRagIndex()
    .then((res) => {
      console.log('Seeding result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
