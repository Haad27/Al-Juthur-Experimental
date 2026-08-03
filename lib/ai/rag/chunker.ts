import { RagParentDocument, RagChildChunk, insertParentDocument, insertChildChunk } from './db';
import { generateEmbedding } from './embeddings';

/**
 * Splits text into semantic child chunks around 200-350 tokens (words),
 * respecting paragraph and sentence boundaries so idea units remain cohesive.
 */
export function splitIntoChildChunks(
  parentId: string,
  content: string,
  metadata: {
    surahId: number | null;
    ayahId: number | null;
    authorId: number;
    workType: 'tafsir' | 'lexicon';
    language: string;
    rootWord: string | null;
  },
  maxWordsPerChunk = 250,
  overlapWords = 35
): Omit<RagChildChunk, 'embedding'>[] {
  const chunks: Omit<RagChildChunk, 'embedding'>[] = [];
  if (!content || content.trim().length === 0) return chunks;

  // Split by natural paragraph breaks first
  const paragraphs = content.split(/\r?\n\r?\n/).map((p) => p.trim()).filter(Boolean);

  let currentWords: string[] = [];
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const pWords = paragraph.split(/\s+/).filter(Boolean);

    // If adding this paragraph keeps us within maxWordsPerChunk, append it
    if (currentWords.length + pWords.length <= maxWordsPerChunk) {
      currentWords.push(...pWords);
    } else {
      // If currentWords has substantial content, push as a chunk
      if (currentWords.length > 40) {
        chunks.push({
          id: `${parentId}-c${chunkIndex++}`,
          parentId,
          chunkIndex: chunkIndex - 1,
          content: currentWords.join(' '),
          surahId: metadata.surahId,
          ayahId: metadata.ayahId,
          authorId: metadata.authorId,
          workType: metadata.workType,
          language: metadata.language,
          rootWord: metadata.rootWord,
        });

        // Keep overlap for continuity
        currentWords = currentWords.slice(Math.max(0, currentWords.length - overlapWords));
      }

      // Now add current paragraph words
      currentWords.push(...pWords);

      // If a single paragraph is larger than maxWordsPerChunk, split by isnad/sentence boundaries
      while (currentWords.length > maxWordsPerChunk) {
        let splitIndex = maxWordsPerChunk;
        
        // Search backwards from maxWordsPerChunk down to 100 words for a good breaking point
        for (let i = maxWordsPerChunk; i > 100; i--) {
          const word = currentWords[i];
          const prevWord = currentWords[i - 1] || '';
          
          // 1. Break BEFORE an isnad marker
          if (word === 'حدثنا' || word === 'أخبرنا' || word === 'أنبأنا' || word === 'قال' || word === 'حدثني') {
            splitIndex = i;
            break;
          }
          
          // 2. Break AFTER a sentence boundary
          if (prevWord.endsWith('.') || prevWord.endsWith('!') || prevWord.endsWith('؟') || prevWord.endsWith(':')) {
            splitIndex = i;
            break;
          }
        }
        
        const slice = currentWords.slice(0, splitIndex);
        chunks.push({
          id: `${parentId}-c${chunkIndex++}`,
          parentId,
          chunkIndex: chunkIndex - 1,
          content: slice.join(' '),
          surahId: metadata.surahId,
          ayahId: metadata.ayahId,
          authorId: metadata.authorId,
          workType: metadata.workType,
          language: metadata.language,
          rootWord: metadata.rootWord,
        });
        currentWords = currentWords.slice(splitIndex - Math.min(splitIndex, overlapWords));
      }
    }
  }

  // Push remaining words
  if (currentWords.length > 0) {
    chunks.push({
      id: `${parentId}-c${chunkIndex++}`,
      parentId,
      chunkIndex: chunkIndex - 1,
      content: currentWords.join(' '),
      surahId: metadata.surahId,
      ayahId: metadata.ayahId,
      authorId: metadata.authorId,
      workType: metadata.workType,
      language: metadata.language,
      rootWord: metadata.rootWord,
    });
  }

  return chunks;
}

/**
 * Indexes a complete parent document along with its child chunks into the RAG database.
 */
export async function indexParentDocumentWithChildren(doc: RagParentDocument): Promise<{
  parentId: string;
  childCount: number;
}> {
  // 1. Insert Parent Block
  insertParentDocument(doc);

  // 2. Generate Child Chunks
  const childChunkSpecs = splitIntoChildChunks(doc.id, doc.content, {
    surahId: doc.surahId,
    ayahId: doc.ayahId,
    authorId: doc.authorId,
    workType: doc.workType,
    language: doc.language,
    rootWord: doc.rootWord,
  });

  // 3. Compute Embeddings & Insert Child Chunks
  for (const spec of childChunkSpecs) {
    const embedding = await generateEmbedding(spec.content);
    insertChildChunk({
      ...spec,
      embedding,
    });
  }

  return {
    parentId: doc.id,
    childCount: childChunkSpecs.length,
  };
}
