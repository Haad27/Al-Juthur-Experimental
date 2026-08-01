import { PrismaClient } from '@prisma/client';
import { clearRagIndex, getRagDb, insertParentDocument, insertChildChunk } from '../lib/ai/rag/db';
import { splitIntoChildChunks } from '../lib/ai/rag/chunker';
import { generateEmbedding } from '../lib/ai/rag/embeddings';
import { getLexiconEntriesForRoot } from '../lib/lexicon/service';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Target Authors across the 6 Modes
export const MODE_AUTHORS = {
  default: [61, 22, 21, 18, 20], // Ibn Kathir En, Tabari, Baghawi, Qurtubi, Tahrir wa al-Tanwir
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

async function embedWithRateLimit(text: string, requestCount: { count: number; lastReset: number }): Promise<number[]> {
  // Rate limit: max 80 per minute
  const now = Date.now();
  if (now - requestCount.lastReset > 60000) {
    requestCount.count = 0;
    requestCount.lastReset = now;
  }
  if (requestCount.count >= 80) {
    const waitTime = 60000 - (now - requestCount.lastReset);
    console.log(`[RATE LIMIT] Waiting ${Math.ceil(waitTime/1000)}s for cooldown...`);
    await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
    requestCount.count = 0;
    requestCount.lastReset = Date.now();
  }
  requestCount.count++;
  
  // Retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (err) {
      if (attempt === 3) throw err;
      console.warn(`Embedding attempt ${attempt} failed, retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  throw new Error('Should not reach here');
}

export async function seedAllModesRagIndex(options?: {
  surahs?: number[];
  roots?: string[];
  fresh?: boolean;
}): Promise<{
  tafsirIndexed: number;
  lexiconIndexed: number;
}> {
  const surahsToSeed = options?.surahs || Array.from({length: 114}, (_, i) => i + 1);
  const rootsToSeed = options?.roots || [
    'حمد', 'صبر', 'علم', 'عبد', 'ربب', 'رحم', 'ملك', 'هدي', 'نور', 'كتب',
    'بلي', 'شكر', 'غفر', 'حكم', 'عدل', 'صدق', 'كفر', 'شرك', 'نفس', 'قلب'
  ];

  console.log('=== Seeding RAG Index for All 6 Modes ===');
  console.log(`Target Surahs: ${surahsToSeed.length} surahs`);
  console.log(`Target Roots: ${rootsToSeed.join(', ')}`);
  
  // If fresh mode, clear existing index to re-embed with new model
  if (options?.fresh) {
    console.log('FRESH MODE: Clearing existing RAG index for full re-embed...');
    clearRagIndex();
  }
  
  const ragDb = getRagDb();
  const checkDocStmt = ragDb.prepare('SELECT id FROM rag_parent_documents WHERE id = ?');

  let tafsirCount = 0;
  let lexiconCount = 0;
  let totalEmbeddings = 0;
  const startTime = Date.now();
  
  const requestCount = { count: 0, lastReset: Date.now() };

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

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.text || entry.text.trim().length === 0) continue;

    const docId = `tafsir-${entry.authorId}-${entry.surahId}-${entry.ayahNo}`;
    
    // Check if it already exists in the RAG DB (by ID)
    const existing = checkDocStmt.get(docId);
    if (existing) {
      continue;
    }

    const author = authorMap.get(entry.authorId);
    const authorName = author ? (author.authorName || author.name) : `Author ${entry.authorId}`;
    const workTitle = author ? author.name : `Tafsir Book ${entry.authorId}`;
    const lang = entry.authorId === 61 ? 'en' : 'ar'; // 61 is English Ibn Kathir

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
      const embedding = await embedWithRateLimit(spec.content, requestCount);
      insertChildChunk({
        ...spec,
        embedding,
      });
      totalEmbeddings++;
    }

    tafsirCount++;
    if (tafsirCount % 10 === 0 || i === entries.length - 1) {
      const percent = ((i + 1) / entries.length * 100).toFixed(2);
      console.log(`Embedded ${i + 1}/${entries.length} chunks (${percent}% complete)`);
    }
  }

  // 2. Index Lexicon entries across target roots
  console.log(`\nIndexing Lexicon roots across ${ALL_LEXICON_DICT_IDS.length} primary dictionaries...`);
  let lexiconProcessed = 0;
  for (const root of rootsToSeed) {
    const lexResult = getLexiconEntriesForRoot(root);

    for (const entry of lexResult.entries) {
      if (!ALL_LEXICON_DICT_IDS.includes(entry.dictId)) continue;
      
      const docId = `lexicon-${entry.dictIdent}-${root}`;
      
      // Check if it already exists in the RAG DB (by ID)
      const existing = checkDocStmt.get(docId);
      if (existing) {
        continue;
      }
      
      const fullContent = entry.definitions
        .map((d) => d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .join('\n\n');

      if (!fullContent || fullContent.trim().length === 0) continue;

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
        const embedding = await embedWithRateLimit(spec.content, requestCount);
        insertChildChunk({
          ...spec,
          embedding,
        });
        totalEmbeddings++;
      }

      lexiconCount++;
      lexiconProcessed++;
      if (lexiconProcessed % 5 === 0) {
        console.log(`Indexed ${lexiconProcessed} Lexicon entries...`);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);

  console.log(`\n=== Seeding Complete! ===`);
  console.log(`Indexed ${tafsirCount} Tafsir entries and ${lexiconCount} Lexicon entries`);
  console.log(`Total embeddings generated: ${totalEmbeddings}`);
  console.log(`Total time: ${mins}:${secs.toString().padStart(2, '0')}`);
  
  return {
    tafsirIndexed: tafsirCount,
    lexiconIndexed: lexiconCount,
  };
}

if (require.main === module) {
  // Always run fresh when invoked from CLI to ensure new embeddings
  seedAllModesRagIndex({ fresh: true })
    .then((res) => {
      console.log('Result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error seeding RAG modes:', err);
      process.exit(1);
    });
}
