import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface RagParentDocument {
  id: string;
  workType: 'tafsir' | 'lexicon' | 'textbook';
  authorId: number;
  authorName: string;
  workTitle: string;
  language: 'en' | 'ar' | 'ur' | string;
  surahId: number | null;
  ayahId: number | null;
  rootWord: string | null;
  content: string;
}

export interface RagChildChunk {
  id: string;
  parentId: string;
  chunkIndex: number;
  content: string;
  surahId: number | null;
  ayahId: number | null;
  authorId: number;
  workType: 'tafsir' | 'lexicon' | 'textbook';
  language: string;
  rootWord: string | null;
  embedding?: number[];
}

const globalForRag = globalThis as unknown as {
  ragDb: Database.Database | undefined;
};

export function getRagDb(): Database.Database | undefined {
  if (!globalForRag.ragDb) {
    try {
      const dbDir = path.join(process.cwd(), 'database', 'rag');
      const dbPath = path.join(dbDir, 'ai_scholar_rag.sqlite');
      
      if (!fs.existsSync(dbPath)) {
        return undefined;
      }
      
      const db = new Database(dbPath, { readonly: true });

    // Optimize SQLite settings
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Create schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS rag_parent_documents (
        id TEXT PRIMARY KEY,
        workType TEXT NOT NULL,
        authorId INTEGER NOT NULL,
        authorName TEXT NOT NULL,
        workTitle TEXT NOT NULL,
        language TEXT NOT NULL,
        surahId INTEGER,
        ayahId INTEGER,
        rootWord TEXT,
        content TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_parent_surah_ayah ON rag_parent_documents(surahId, ayahId);
      CREATE INDEX IF NOT EXISTS idx_parent_author ON rag_parent_documents(authorId);
      CREATE INDEX IF NOT EXISTS idx_parent_root ON rag_parent_documents(rootWord);

      CREATE TABLE IF NOT EXISTS rag_child_chunks (
        id TEXT PRIMARY KEY,
        parentId TEXT NOT NULL,
        chunkIndex INTEGER NOT NULL,
        content TEXT NOT NULL,
        surahId INTEGER,
        ayahId INTEGER,
        authorId INTEGER NOT NULL,
        workType TEXT NOT NULL,
        language TEXT NOT NULL,
        rootWord TEXT,
        embedding TEXT,
        FOREIGN KEY(parentId) REFERENCES rag_parent_documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_child_parent ON rag_child_chunks(parentId);
      CREATE INDEX IF NOT EXISTS idx_child_surah_ayah ON rag_child_chunks(surahId, ayahId);
      CREATE INDEX IF NOT EXISTS idx_child_author ON rag_child_chunks(authorId);

      CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(
        id UNINDEXED,
        content,
        authorName,
        rootWord,
        tokenize='unicode61 remove_diacritics 2'
      );
    `);

      globalForRag.ragDb = db;
    } catch (err) {
      console.warn('Failed to initialize local RAG DB. RAG features will be disabled:', err);
      // We cannot return undefined if the return type is strictly Database.Database.
      // So we must change the signature or cast. Let's cast to any for a quick bypass,
      // and let callers handle the falsy return.
      return undefined as any;
    }
  }
  return globalForRag.ragDb as Database.Database;
}

export function insertParentDocument(doc: RagParentDocument) {
  const db = getRagDb();
  if (!db) return;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO rag_parent_documents
    (id, workType, authorId, authorName, workTitle, language, surahId, ayahId, rootWord, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    doc.id,
    doc.workType,
    doc.authorId,
    doc.authorName,
    doc.workTitle,
    doc.language,
    doc.surahId,
    doc.ayahId,
    doc.rootWord,
    doc.content
  );
}

export function insertChildChunk(chunk: RagChildChunk) {
  const db = getRagDb();
  if (!db) return;
  const embeddingJson = chunk.embedding ? JSON.stringify(chunk.embedding) : null;

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO rag_child_chunks
    (id, parentId, chunkIndex, content, surahId, ayahId, authorId, workType, language, rootWord, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    chunk.id,
    chunk.parentId,
    chunk.chunkIndex,
    chunk.content,
    chunk.surahId,
    chunk.ayahId,
    chunk.authorId,
    chunk.workType,
    chunk.language,
    chunk.rootWord,
    embeddingJson
  );

  // Insert into FTS5 index
  const ftsStmt = db.prepare(`
    INSERT OR REPLACE INTO rag_fts (id, content, authorName, rootWord)
    VALUES (?, ?, ?, ?)
  `);
  ftsStmt.run(
    chunk.id,
    chunk.content,
    chunk.workType === 'tafsir' ? `Author ${chunk.authorId}` : (chunk.workType === 'lexicon' ? 'Lexicon' : 'Textbook'),
    chunk.rootWord || ''
  );
}

export function clearRagIndex() {
  const db = getRagDb();
  if (!db) return;
  db.exec(`
    DELETE FROM rag_fts;
    DELETE FROM rag_child_chunks;
    DELETE FROM rag_parent_documents;
  `);
}
