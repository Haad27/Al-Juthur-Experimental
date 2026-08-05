import { PrismaClient } from '@prisma/client';
import { getRagDb, insertParentDocument, insertChildChunk } from '../lib/ai/rag/db';
import { splitIntoChildChunks } from '../lib/ai/rag/chunker';
import { generateEmbedding } from '../lib/ai/rag/embeddings';
import * as fs from 'fs';
import * as path from 'path';

// Load .env if running standalone
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config();

const prisma = new PrismaClient();

async function embedWithRateLimit(text: string, requestCount: { count: number; lastReset: number }): Promise<number[]> {
  const now = Date.now();
  if (now - requestCount.lastReset > 60000) {
    requestCount.count = 0;
    requestCount.lastReset = now;
  }
  if (requestCount.count >= 80) {
    const waitTime = 60000 - (now - requestCount.lastReset);
    console.log(`[RATE LIMIT] Waiting ${Math.ceil(waitTime / 1000)}s for cooldown...`);
    await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
    requestCount.count = 0;
    requestCount.lastReset = Date.now();
  }
  requestCount.count++;

  let attempt = 1;
  while (true) {
    try {
      return await generateEmbedding(text);
    } catch (err: any) {
      const isNetworkDrop = err?.message?.includes('fetch failed') || err?.message?.includes('ECONNRESET') || err?.code === 'ECONNRESET';
      if (isNetworkDrop || attempt <= 3) {
        console.warn(`[NETWORK] Embedding attempt ${attempt} failed. Retrying in 10 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempt++;
      } else {
        throw err;
      }
    }
  }
}

export async function seedDreamTextbook() {
  const mdPath = path.join(process.cwd(), 'database', 'dream', 'dream_textbook.md');
  if (!fs.existsSync(mdPath)) {
    console.error('dream_textbook.md not found. Please run parse_dream_pdf.ts first.');
    process.exit(1);
  }

  const content = fs.readFileSync(mdPath, 'utf8');
  
  // Split by ## or ### headers
  const sections = content.split(/^#{2,3}\s+/m).filter(s => s.trim().length > 0);
  
  console.log(`Found ${sections.length} sections in the Dream Textbook.`);
  
  const ragDb = getRagDb();
  const checkDocStmt = ragDb.prepare('SELECT id FROM rag_parent_documents WHERE id = ?');
  
  let sectionCount = 0;
  let totalEmbeddings = 0;
  const requestCount = { count: 0, lastReset: Date.now() };

  for (let i = 0; i < sections.length; i++) {
    const sectionText = sections[i].trim();
    if (sectionText.length < 10) continue; // skip empty or tiny sections
    
    // The first line is usually the header text because we split by the ## itself
    const lines = sectionText.split('\n');
    const headerTitle = lines[0].trim().replace(/[*_`]/g, '');
    
    const docId = `dream-sec-${i}`;
    
    const existing = checkDocStmt.get(docId);
    if (existing) {
      continue;
    }
    
    const parentDoc = {
      id: docId,
      workType: 'textbook' as const,
      authorId: 999, // Special ID for Dream Textbook
      authorName: 'Bayyinah',
      workTitle: `Dream Textbook: ${headerTitle.substring(0, 50)}`,
      language: 'en', // Mixed but predominantly English instruction
      surahId: null,
      ayahId: null,
      rootWord: null,
      content: sectionText,
    };
    
    insertParentDocument(parentDoc);
    
    const childChunkSpecs = splitIntoChildChunks(docId, sectionText, {
      surahId: null,
      ayahId: null,
      authorId: 999,
      workType: 'textbook',
      language: 'en',
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
    
    sectionCount++;
    if (sectionCount % 10 === 0 || i === sections.length - 1) {
      const percent = ((i + 1) / sections.length * 100).toFixed(2);
      console.log(`Embedded ${i + 1}/${sections.length} sections (${percent}% complete)`);
    }
  }
  
  console.log(`\n=== Seeding Complete! ===`);
  console.log(`Indexed ${sectionCount} Textbook sections`);
  console.log(`Total embeddings generated: ${totalEmbeddings}`);
}

if (require.main === module) {
  seedDreamTextbook()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
