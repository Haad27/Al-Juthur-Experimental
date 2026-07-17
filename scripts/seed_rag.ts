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
    
    // Fetch entries for this author
    const entries = db.prepare(`
      SELECT t.id, t.text, a.numberInSurah as ayah, a.surahId as surah
      FROM TafsirEntry t
      JOIN Ayah a ON t.ayahId = a.id
      WHERE t.authorId = ?
    `).all(author.id) as any[];

    console.log(`Found ${entries.length} entries for ${author.name}.`);

    let processedCount = 0;
    for (const entry of entries) {
      // 1. Clean HTML tags from the Tafsir text
      const cleanText = entry.text.replace(/<[^>]*>?/gm, '');
      if (!cleanText || cleanText.length < 10) continue;

      // 2. Chunk text
      const chunks = chunkText(cleanText, 1000);

      // 3. Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          // Add metadata to the text so the embedding captures context implicitly
          const embedText = `Tafsir ${author.name} for Surah ${entry.surah} Ayah ${entry.ayah}:\n${chunk}`;
          const embedding = await getEmbedding(embedText);

          // 4. Insert into Supabase
          const { error } = await supabase.from('rag_documents').insert({
            content: chunk,
            embedding: embedding,
            metadata: {
              book: author.name,
              surah: entry.surah,
              ayah: entry.ayah,
              chunk_index: i
            }
          });

          if (error) {
            console.error(`Supabase Insert Error (Surah ${entry.surah}:${entry.ayah}):`, error);
          }
        } catch (err: any) {
          console.error(`Embedding failed for ${entry.surah}:${entry.ayah}:`, err.message);
          // Wait to respect Gemini limits if rate limited
          if (err.message.includes('429')) {
            console.log("Rate limited. Waiting 60 seconds...");
            await new Promise(r => setTimeout(r, 60000));
          }
        }
      }

      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`...Processed ${processedCount}/${entries.length} entries for ${author.name}`);
      }
      
      // Delay to respect Gemini free tier limits (1500 RPM)
      await new Promise(r => setTimeout(r, 200)); 
    }
  }

  console.log("\nVector Seeding Complete!");
}

seedTafsir().catch(console.error);
