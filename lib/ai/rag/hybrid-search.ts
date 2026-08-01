import { getRagDb, RagParentDocument } from './db';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { RagMode } from './query-router';
import { MODE_AUTHORS } from '../../../scripts/seed_rag_modes';
import Database from 'better-sqlite3';
import path from 'path';

export interface HybridSearchFilters {
  surahId?: number;
  ayahId?: number;
  authorId?: number;
  workType?: 'tafsir' | 'lexicon';
  language?: string;
  rootWord?: string;
  mode?: RagMode;
  keywords?: string[];
  expandedQueryAr?: string;
  suggestedVerses?: { surah: number; ayah: number }[];
}

export interface ScoredParentDocument extends RagParentDocument {
  rrfScore: number;
  matchedChildSnippets: string[];
  relevanceExplanation?: string;
}

/**
 * Performs Hybrid Retrieval (BM25 Lexical + Dense Vector + Structural SQL Filter + Mode Source Bounds + RRF Fusion)
 * and returns full Parent Documents with combined scores.
 */
export async function searchHybrid(
  query: string,
  filters: HybridSearchFilters = {},
  topK = 6
): Promise<ScoredParentDocument[]> {
  const db = getRagDb();
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim();

  // Build structural SQL filter condition
  const sqlConditions: string[] = ['1=1'];
  const sqlParams: any[] = [];

  if (typeof filters.surahId === 'number' && filters.surahId >= 1 && filters.surahId <= 114) {
    sqlConditions.push('surahId = ?');
    sqlParams.push(filters.surahId);
  }
  if (typeof filters.ayahId === 'number' && filters.ayahId >= 1 && filters.ayahId <= 286) {
    sqlConditions.push('ayahId = ?');
    sqlParams.push(filters.ayahId);
  }
  if (filters.authorId) {
    sqlConditions.push('authorId = ?');
    sqlParams.push(filters.authorId);
  }
  if (filters.workType) {
    sqlConditions.push('workType = ?');
    sqlParams.push(filters.workType);
  }
  if (filters.language) {
    sqlConditions.push('language = ?');
    sqlParams.push(filters.language);
  }
  if (filters.rootWord) {
    sqlConditions.push('rootWord = ?');
    sqlParams.push(filters.rootWord);
  }

  // Enforce strict Mode Author/Dict bounds
  if (filters.mode && MODE_AUTHORS[filters.mode]) {
    const allowedIds = MODE_AUTHORS[filters.mode];
    if (filters.mode === 'lexicon') {
      sqlConditions.push(`workType = 'lexicon' AND authorId IN (${allowedIds.join(',')})`);
    } else {
      sqlConditions.push(`workType = 'tafsir' AND authorId IN (${allowedIds.join(',')})`);
    }
  }

  const whereClause = sqlConditions.join(' AND ');

  // 1. BM25 / FTS5 Search on child chunks (using expanded terms from LLM 1)
  const bm25Matches = new Map<string, { rank: number; snippet: string }>();
  try {
    const searchTokens = new Set<string>();
    cleanQuery.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).forEach((t) => { if (t.length > 2) searchTokens.add(t); });

    if (filters.expandedQueryAr) {
      filters.expandedQueryAr.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).forEach((t) => { if (t.length > 2) searchTokens.add(t); });
    }
    if (filters.keywords) {
      filters.keywords.forEach((k) => {
        k.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).forEach((t) => { if (t.length > 2) searchTokens.add(t); });
      });
    }
    if (filters.rootWord && filters.rootWord.length >= 3) {
      searchTokens.add(filters.rootWord);
    }

    const ftsQuery = Array.from(searchTokens).slice(0, 15).join(' OR ');

    if (ftsQuery.length > 0) {
      const ftsRows = db
        .prepare(
          `
          SELECT c.id, c.parentId, c.content
          FROM rag_fts f
          JOIN rag_child_chunks c ON f.id = c.id
          WHERE rag_fts MATCH ? AND ${whereClause}
          LIMIT 50
        `
        )
        .all(ftsQuery, ...sqlParams) as { id: string; parentId: string; content: string }[];

      ftsRows.forEach((row, idx) => {
        if (!bm25Matches.has(row.parentId)) {
          bm25Matches.set(row.parentId, { rank: idx + 1, snippet: row.content });
        }
      });
    }
  } catch (err) {
    // FTS query fallback if syntax error
  }

  // 2. Vector Semantic Search on child chunks (using combined semantic text)
  const vectorSearchInput = [cleanQuery, filters.expandedQueryAr, ...(filters.keywords || [])].filter(Boolean).join(' ');
  const queryVec = await generateEmbedding(vectorSearchInput);
  const candidateRows = db
    .prepare(
      `
      SELECT id, parentId, content, embedding
      FROM rag_child_chunks
      WHERE ${whereClause}
      LIMIT 600
    `
    )
    .all(...sqlParams) as { id: string; parentId: string; content: string; embedding: string | null }[];

  const scoredVectorChunks = candidateRows
    .map((row) => {
      let score = 0;
      if (row.embedding) {
        try {
          const vec = JSON.parse(row.embedding);
          score = cosineSimilarity(queryVec, vec);
        } catch (e) {}
      }
      return { ...row, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  const vectorMatches = new Map<string, { rank: number; snippet: string }>();
  scoredVectorChunks.forEach((row, idx) => {
    if (!vectorMatches.has(row.parentId)) {
      vectorMatches.set(row.parentId, { rank: idx + 1, snippet: row.content });
    }
  });

  // 3. Reciprocal Rank Fusion (RRF) across Parent Documents
  const allParentIds = new Set<string>([...bm25Matches.keys(), ...vectorMatches.keys()]);

  // --- NEW: LLM Verse Suggestion Structural Fetch ---
  let suggestedVerseResults: ScoredParentDocument[] = [];
  console.log('[HYBRID-SEARCH] suggestedVerses received:', filters.suggestedVerses, '| mode:', filters.mode);
  
  if (filters.suggestedVerses && filters.suggestedVerses.length > 0 && filters.mode && filters.mode !== 'lexicon') {
    try {
      const devDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      const devDb = new Database(devDbPath, { readonly: true });
      const allowedAuthorIds = MODE_AUTHORS[filters.mode] || MODE_AUTHORS.default;
      
      console.log('[HYBRID-SEARCH] Fetching tafsir for', filters.suggestedVerses.length, 'suggested verses from authors:', allowedAuthorIds);
      
      const numVerses = filters.suggestedVerses.length;
      let verseResults: any[] = [];
      
      for (let i = 0; i < numVerses; i++) {
        const verse = filters.suggestedVerses[i];
        let authorLimit = allowedAuthorIds.length;
        if (numVerses > 2) {
          authorLimit = i < 2 ? allowedAuthorIds.length : 2; 
        }
        
        const querySql = `
          SELECT t.id, t.authorId, t.surahId, a.numberInSurah as ayahNo, t.text, au.name as authorName
          FROM TafsirEntry t
          JOIN Ayah a ON t.ayahId = a.id
          JOIN Author au ON t.authorId = au.id
          WHERE t.authorId IN (${allowedAuthorIds.slice(0, authorLimit).join(',')})
            AND t.surahId = ? AND a.numberInSurah = ?
        `;
        
        const rows = devDb.prepare(querySql).all(verse.surah, verse.ayah) as any[];
        console.log(`[HYBRID-SEARCH] Verse ${verse.surah}:${verse.ayah} → ${rows.length} tafsir entries found`);
        verseResults.push(...rows);
      }
      
      console.log('[HYBRID-SEARCH] Total verse suggestion results:', verseResults.length);
      
      if (verseResults.length > 0) {
        suggestedVerseResults = verseResults.map((row) => ({
          id: `tafsir-${row.authorId}-${row.surahId}-${row.ayahNo}`,
          workType: 'tafsir' as const,
          authorId: row.authorId,
          authorName: row.authorName,
          workTitle: row.authorName,
          language: row.authorId === 61 ? 'en' : 'ar',
          surahId: row.surahId,
          ayahId: row.ayahNo,
          rootWord: null,
          content: row.text,
          rrfScore: 0.95,
          matchedChildSnippets: [row.text.substring(0, 300)],
          relevanceExplanation: `LLM-suggested verse from ${row.authorName} (${row.surahId}:${row.ayahNo})`
        }));
      }
    } catch (e) {
      console.warn('[HYBRID-SEARCH] Verse Suggestion Structural Fetch FAILED:', e);
    }
  } else {
    console.log('[HYBRID-SEARCH] No suggested verses to fetch (empty/undefined or lexicon mode)');
  }


  // Direct structural fallback: If local vector/BM25 matches are empty OR if we have explicit Surah coordinate (e.g. Surah 1) to guarantee exact verse boundaries
  if ((allParentIds.size === 0 || typeof filters.surahId === 'number') && filters.mode && filters.mode !== 'lexicon') {
    // Check if we have exact surahId and/or ayahId
    if (typeof filters.surahId === 'number') {
      try {
        const devDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        const devDb = new Database(devDbPath, { readonly: true });
        const allowedAuthorIds = MODE_AUTHORS[filters.mode] || MODE_AUTHORS.default;
        
        let querySql = `
          SELECT t.id, t.authorId, t.surahId, a.numberInSurah as ayahNo, t.text, au.name as authorName
          FROM TafsirEntry t
          JOIN Ayah a ON t.ayahId = a.id
          JOIN Author au ON t.authorId = au.id
          WHERE t.authorId IN (${allowedAuthorIds.join(',')})
            AND t.surahId = ?
        `;
        const queryParams: any[] = [filters.surahId];

        if (typeof filters.ayahId === 'number') {
          querySql += ' AND a.numberInSurah = ?';
          queryParams.push(filters.ayahId);
        }

        querySql += ' ORDER BY a.numberInSurah ASC, t.authorId ASC LIMIT ?';
        queryParams.push(topK * 2);

        const devRows = devDb.prepare(querySql).all(...queryParams) as any[];

        if (devRows && devRows.length > 0) {
          // If we had no vector/bm25 hits OR if the hits don't cover the requested surah cleanly, return these direct passages
          if (allParentIds.size === 0 || typeof filters.surahId === 'number') {
            const directResults = devRows.map((row) => ({
              id: `tafsir-${row.authorId}-${row.surahId}-${row.ayahNo}`,
              workType: 'tafsir' as const,
              authorId: row.authorId,
              authorName: row.authorName,
              workTitle: row.authorName,
              language: row.authorId === 61 ? 'en' : 'ar',
              surahId: row.surahId,
              ayahId: row.ayahNo,
              rootWord: null,
              content: row.text,
              rrfScore: 1.0,
              matchedChildSnippets: [row.text.substring(0, 300)],
              relevanceExplanation: `Exact Surah/Ayah passage from ${row.authorName} (${row.surahId}:${row.ayahNo})`
            }));
            
            // If explicit surahId filter was provided (like summarizing Surah 1), return ONLY verses of that surah
            if (typeof filters.surahId === 'number') {
              return directResults.slice(0, topK + 4);
            }
          }
        }
      } catch (e) {
        console.warn('Direct dev.db structural query failed:', e);
      }
    }

    if (allParentIds.size === 0) {
      const directParents = db
        .prepare(
          `
          SELECT * FROM rag_parent_documents
          WHERE ${whereClause}
          LIMIT ?
        `
        )
        .all(...sqlParams, topK) as RagParentDocument[];

      if (directParents.length > 0) {
        return directParents.map((p) => ({
          ...p,
          rrfScore: 1.0,
          matchedChildSnippets: [p.content.substring(0, 300)],
          relevanceExplanation: `Direct structural match for ${p.workTitle}`,
        }));
      }
    }
  }

  const k = 60; // RRF smoothing constant
  const parentScores: Array<{ parentId: string; score: number; snippets: string[] }> = [];

  for (const parentId of allParentIds) {
    const bmEntry = bm25Matches.get(parentId);
    const vecEntry = vectorMatches.get(parentId);

    const bmRank = bmEntry ? bmEntry.rank : 999;
    const vecRank = vecEntry ? vecEntry.rank : 999;

    const rrfScore = (bmEntry ? 1 / (k + bmRank) : 0) + (vecEntry ? 1 / (k + vecRank) : 0);

    const snippets: string[] = [];
    if (bmEntry) snippets.push(bmEntry.snippet);
    if (vecEntry && !snippets.includes(vecEntry.snippet)) snippets.push(vecEntry.snippet);

    parentScores.push({
      parentId,
      score: rrfScore,
      snippets,
    });
  }

  parentScores.sort((a, b) => b.score - a.score);
  const topParents = parentScores.slice(0, topK);

  // 4. Retrieve Full Parent Blocks from SQLite
  let results: ScoredParentDocument[] = [];
  for (const item of topParents) {
    const parentRow = db
      .prepare('SELECT * FROM rag_parent_documents WHERE id = ?')
      .get(item.parentId) as RagParentDocument | undefined;

    if (parentRow) {
      results.push({
        ...parentRow,
        rrfScore: item.score,
        matchedChildSnippets: item.snippets,
        relevanceExplanation: `Matched via ${bm25Matches.has(item.parentId) ? 'Keyword (BM25)' : ''} ${
          bm25Matches.has(item.parentId) && vectorMatches.has(item.parentId) ? '+' : ''
        } ${vectorMatches.has(item.parentId) ? 'Semantic Vector' : ''}`.trim(),
      });
    }
  }

  // Combine suggested verses
  if (suggestedVerseResults.length > 0) {
    results = [...suggestedVerseResults, ...results];
    
    // Deduplicate by id (which incorporates authorId+surahId+ayahId)
    const uniqueMap = new Map<string, ScoredParentDocument>();
    results.forEach(r => {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    });
    results = Array.from(uniqueMap.values());
    
    // Hard cap at topK + 6
    if (results.length > topK + 6) {
      results = results.slice(0, topK + 6);
    }
  }

  return results;
}
