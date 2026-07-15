import { getRagDb, RagParentDocument } from './db';
import { generateEmbedding, cosineSimilarity } from './embeddings';

export interface HybridSearchFilters {
  surahId?: number;
  ayahId?: number;
  authorId?: number;
  workType?: 'tafsir' | 'lexicon';
  language?: string;
  rootWord?: string;
}

export interface ScoredParentDocument extends RagParentDocument {
  rrfScore: number;
  matchedChildSnippets: string[];
  relevanceExplanation?: string;
}

/**
 * Performs Hybrid Retrieval (BM25 Lexical + Dense Vector + Structural SQL Filter + RRF Fusion)
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

  if (filters.surahId) {
    sqlConditions.push('surahId = ?');
    sqlParams.push(filters.surahId);
  }
  if (filters.ayahId) {
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

  const whereClause = sqlConditions.join(' AND ');

  // 1. BM25 / FTS5 Search on child chunks
  const bm25Matches = new Map<string, { rank: number; snippet: string }>();
  try {
    // Escape FTS query or prepare simple terms
    const ftsQuery = cleanQuery
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .join(' OR ');

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

  // 2. Vector Semantic Search on child chunks
  const queryVec = await generateEmbedding(cleanQuery);
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

  // If no search matches found but we have explicit filters (e.g. Surah 2 Ayah 255), return those parent documents directly
  if (allParentIds.size === 0 && (filters.surahId || filters.authorId || filters.rootWord)) {
    const directParents = db
      .prepare(
        `
        SELECT * FROM rag_parent_documents
        WHERE ${whereClause}
        LIMIT ?
      `
      )
      .all(...sqlParams, topK) as RagParentDocument[];

    return directParents.map((p) => ({
      ...p,
      rrfScore: 1.0,
      matchedChildSnippets: [p.content.substring(0, 300)],
      relevanceExplanation: `Direct structural match for ${p.workTitle}`,
    }));
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
  const results: ScoredParentDocument[] = [];
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

  return results;
}
