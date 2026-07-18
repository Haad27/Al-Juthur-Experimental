import { createClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!geminiApiKey) {
  console.error("Missing GEMINI_API_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const db = new Database(dbPath, { readonly: true });

import { pipeline } from '@xenova/transformers';

let extractor: any = null;

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    console.log("Loading offline embedding model (Xenova/all-MiniLM-L6-v2)...");
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: false,
    });
    console.log("Offline embedding model loaded successfully!");
  }

  // Generate embeddings
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Function to chunk large texts into smaller pieces (approx 1000 chars) to maintain precise embeddings
function chunkText(text: string, maxLength: number = 1000): string[] {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function seedTafsir() {
  console.log("Starting Vector Seeding Process...");

  // Fetch target books from local SQLite
  const targetAuthors = ['En Tafisr Ibn Kathir', 'Ar Tafsir Al Tabari', 'Tafsir Al Jalalayn'];
  const authors = db.prepare(`SELECT id, name FROM Author WHERE name IN (${targetAuthors.map(a => `'${a}'`).join(',')})`).all() as any[];

  for (const author of authors) {
    console.log(`\nProcessing ${author.name}...`);
    
    // Fetch entries for this author ordered sequentially
    const entries = db.prepare(`
      SELECT t.id, t.text, a.numberInSurah as ayah, a.surahId as surah
      FROM TafsirEntry t
      JOIN Ayah a ON t.ayahId = a.id
      WHERE t.authorId = ?
      ORDER BY a.surahId, a.numberInSurah
    `).all(author.id) as any[];

    console.log(`Found ${entries.length} entries for ${author.name}.`);

    // Fetch the latest seeded entry to allow resumption
    console.log(`Checking latest database record for ${author.name}...`);
    const { data: lastDocs } = await supabase
      .from('rag_documents')
      .select('metadata')
      .eq('metadata->>book', author.name)
      .order('id', { ascending: false })
      .limit(1);

    let lastSurah = 0;
    let lastAyah = 0;
    if (lastDocs && lastDocs.length > 0) {
      const meta = lastDocs[0].metadata as any;
      if (meta) {
        lastSurah = meta.surah;
        lastAyah = meta.ayah;
      }
    }
    console.log(`Resuming seeding for ${author.name} from Surah ${lastSurah} Ayah ${lastAyah}...`);

    let processedCount = 0;
    const batchRows: any[] = [];
    const BATCH_SIZE = 100;

    for (const entry of entries) {
      // Skip already processed sequential entries
      if (entry.surah < lastSurah || (entry.surah === lastSurah && entry.ayah <= lastAyah)) {
        processedCount++;
        continue;
      }

      if (!entry.text) continue;
      const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
      if (!cleanText || cleanText.length < 10) continue;

      const chunks = chunkText(cleanText, 1000);

      // Process each chunk and add to batch
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const embedText = `Tafsir ${author.name} for Surah ${entry.surah} Ayah ${entry.ayah}:\n${chunk}`;
          const embedding = await getEmbedding(embedText);

          batchRows.push({
            content: chunk,
            embedding: embedding,
            metadata: {
              book: author.name,
              surah: entry.surah,
              ayah: entry.ayah,
              chunk_index: i
            }
          });

          // Insert batch if size met
          if (batchRows.length >= BATCH_SIZE) {
            console.log(`Inserting batch of ${batchRows.length} chunks into Supabase...`);
            const { error } = await supabase.from('rag_documents').insert(batchRows);
            if (error) {
              console.error(`Supabase Batch Insert Error:`, error);
            }
            batchRows.length = 0; // Clear the batch
          }
        } catch (err: any) {
          console.error(`Embedding failed for ${entry.surah}:${entry.ayah}:`, err.message);
        }
      }

      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`...Processed ${processedCount}/${entries.length} entries for ${author.name}`);
      }
    }

    // Insert any remaining items
    if (batchRows.length > 0) {
      console.log(`Inserting final batch of ${batchRows.length} chunks into Supabase...`);
      const { error } = await supabase.from('rag_documents').insert(batchRows);
      if (error) {
        console.error(`Supabase Final Batch Insert Error:`, error);
      }
    }
  }

  console.log("\nVector Seeding Complete!");
}

seedTafsir();
