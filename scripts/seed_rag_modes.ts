import { PrismaClient } from '@prisma/client';
import { clearRagIndex, getRagDb, insertParentDocument, insertChildChunk } from '../lib/ai/rag/db';
import { splitIntoChildChunks } from '../lib/ai/rag/chunker';
import { generateLocalSemanticEmbedding } from '../lib/ai/rag/embeddings';
import { getLexiconEntriesForRoot } from '../lib/lexicon/service';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Target Authors across the 6 Modes
export const MODE_AUTHORS = {
  default: [24, 61, 22, 21, 18, 20], // Ibn Kathir Ar/En, Tabari, Baghawi, Qurtubi, Tahrir wa al-Tanwir
  classical: [24, 61, 22, 7],         // Ibn Kathir Ar/En, Tabari, Al-Durr al-Manthur
  grammar: [10, 4, 31],               // Al-Kashshaf, Al-Bahr al-Muhit, I'rab al-Qur'an (Darwish)
  modern: [20, 3, 23],                // Tahrir wa al-Tanwir, Adwa' al-Bayan, Al-Tafsir al-Wasit
  philosophical: [42, 38, 39],        // Tafsir al-Razi, Ruh al-Ma'ani (Alusi), Tafsir al-Baydawi
  lexicon: [1, 2, 10, 11]             // Lane's Lexicon, Lisan al-Arab, Mufradat, Maqayis al-Lughah
};

const ALL_TAFSIR_AUTHOR_IDS = Array.from(
  new Set([
    ...MODE_AUTHORS.default,
    ...MODE_AUTHORS.classical,
    ...MODE_AUTHORS.grammar,
    ...MODE_AUTHORS.modern,
    ...MODE_AUTHORS.philosophical,
  ])
);

const ALL_LEXICON_DICT_IDS = MODE_AUTHORS.lexicon;

export async function seedAllModesRagIndex(options?: {
  surahs?: number[];
  roots?: string[];
}): Promise<{
  tafsirIndexed: number;
  lexiconIndexed: number;
}> {
  const surahsToSeed = options?.surahs || [1, 2, 18, 36, 67, 112, 113, 114];
  const rootsToSeed = options?.roots || [
    'حمد', 'صبر', 'علم', 'عبد', 'ربب', 'رحم', 'ملك', 'هدي', 'نور', 'كتب',
    'بلي', 'شكر', 'غفر', 'حكم', 'عدل', 'صدق', 'كفر', 'شرك', 'نفس', 'قلب'
  ];

  console.log('=== Seeding RAG Index for All 6 Modes ===');
  console.log(`Target Surahs: ${surahsToSeed.join(', ')}`);
  console.log(`Target Roots: ${rootsToSeed.join(', ')}`);
  console.log('Clearing existing RAG SQLite index...');
  clearRagIndex();

  let tafsirCount = 0;
  let lexiconCount = 0;

  // 1. Index Tafsir Entries for target Surahs across all 15 authors
  console.log(`\nIndexing Tafsir entries across ${ALL_TAFSIR_AUTHOR_IDS.length} classical/modern books...`);
  
  // Direct SQLite query on dev.db for maximum speed and zero memory bloat
  const devDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const devDb = new Database(devDbPath, { readonly: true });

  const getAuthorsStmt = devDb.prepare(`SELECT id, name, authorName, languageId FROM Author WHERE id IN (${ALL_TAFSIR_AUTHOR_IDS.join(',')})`);
  const authorRows = getAuthorsStmt.all() as { id: number; name: string; authorName: string | null; languageId: number }[];
  const authorMap = new Map(authorRows.map((a) => [a.id, a]));

  const surahsPlaceholder = surahsToSeed.join(',');
  const getEntriesStmt = devDb.prepare(`
    SELECT t.id, t.authorId, t.surahId, a.numberInSurah as ayahNo, t.text
    FROM TafsirEntry t
    JOIN Ayah a ON t.ayahId = a.id
    WHERE t.authorId IN (${ALL_TAFSIR_AUTHOR_IDS.join(',')})
      AND t.surahId IN (${surahsPlaceholder})
    ORDER BY t.surahId, a.numberInSurah, t.authorId
  `);

  const entries = getEntriesStmt.all() as { id: number; authorId: number; surahId: number; ayahNo: number; text: string }[];
  console.log(`Fetched ${entries.length} Tafsir entries to index.`);

  for (const entry of entries) {
    if (!entry.text || entry.text.trim().length === 0) continue;

    const author = authorMap.get(entry.authorId);
    const authorName = author ? (author.authorName || author.name) : `Author ${entry.authorId}`;
    const workTitle = author ? author.name : `Tafsir Book ${entry.authorId}`;
    const lang = entry.authorId === 61 ? 'en' : 'ar'; // 61 is English Ibn Kathir

    const docId = `tafsir-${entry.authorId}-${entry.surahId}-${entry.ayahNo}`;

    // Insert Parent Block
    const parentDoc = {
      id: docId,
      workType: 'tafsir' as const,
      authorId: entry.authorId,
      authorName,
      workTitle,
      language: lang,
      surahId: entry.surahId,
      ayahId: entry.ayahNo,
      rootWord: null,
      content: entry.text,
    };
    insertParentDocument(parentDoc);

    // Split into Child Chunks & Embed
    const childChunkSpecs = splitIntoChildChunks(docId, entry.text, {
      surahId: entry.surahId,
      ayahId: entry.ayahNo,
      authorId: entry.authorId,
      workType: 'tafsir',
      language: lang,
      rootWord: null,
    });

    for (const spec of childChunkSpecs) {
      const embedding = generateLocalSemanticEmbedding(spec.content);
      insertChildChunk({
        ...spec,
        embedding,
      });
    }

    tafsirCount++;
    if (tafsirCount % 500 === 0) {
      console.log(`Indexed ${tafsirCount} Tafsir entries...`);
    }
  }

  // 2. Index Lexicon entries across target roots
  console.log(`\nIndexing Lexicon roots across ${ALL_LEXICON_DICT_IDS.length} primary dictionaries...`);
  for (const root of rootsToSeed) {
    const lexResult = getLexiconEntriesForRoot(root);

    for (const entry of lexResult.entries) {
      if (!ALL_LEXICON_DICT_IDS.includes(entry.dictId)) continue;
      const fullContent = entry.definitions
        .map((d) => d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .join('\n\n');

      if (!fullContent || fullContent.trim().length === 0) continue;

      const docId = `lexicon-${entry.dictIdent}-${root}`;
      const parentDoc = {
        id: docId,
        workType: 'lexicon' as const,
        authorId: entry.dictId,
        authorName: entry.dictName,
        workTitle: entry.dictName,
        language: entry.isEnglish ? 'en' : 'ar',
        surahId: null,
        ayahId: null,
        rootWord: root,
        content: fullContent,
      };
      insertParentDocument(parentDoc);

      const childChunkSpecs = splitIntoChildChunks(docId, fullContent, {
        surahId: null,
        ayahId: null,
        authorId: entry.dictId,
        workType: 'lexicon',
        language: entry.isEnglish ? 'en' : 'ar',
        rootWord: root,
      });

      for (const spec of childChunkSpecs) {
        const embedding = generateLocalSemanticEmbedding(spec.content);
        insertChildChunk({
          ...spec,
          embedding,
        });
      }

      lexiconCount++;
    }
  }

  console.log(`\n=== Seeding Complete! ===`);
  console.log(`Indexed ${tafsirCount} Tafsir entries and ${lexiconCount} Lexicon entries into local RAG database.`);
  return {
    tafsirIndexed: tafsirCount,
    lexiconIndexed: lexiconCount,
  };
}

if (require.main === module) {
  seedAllModesRagIndex()
    .then((res) => {
      console.log('Result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding RAG modes:', err);
      process.exit(1);
    });
}
