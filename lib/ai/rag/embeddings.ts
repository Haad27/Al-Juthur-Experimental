/**
 * Multi-provider Embedding Service for Academic AI Scholar RAG
 * Supports local deterministic semantic embeddings (zero-config/testing),
 * OpenAI Embeddings, and Google Gemini Embeddings.
 */

export interface EmbeddingOptions {
  model?: string;
}

/**
 * Computes cosine similarity between two numeric vectors.
 */



export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}



/**
 * Local deterministic semantic hash embedding (384 dimensions).
 * Generates semantic feature vectors based on character character & word n-grams
 * so unit tests and local development work immediately without API calls.
 */
export function generateLocalSemanticEmbedding(text: string, dim = 384): number[] {
  const vector = new Array(dim).fill(0);
  if (!text || text.trim().length === 0) return vector;

  const cleanText = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);

  // Word-level hash features
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 2166136261;
    for (let c = 0; c < word.length; c++) {
      hash ^= word.charCodeAt(c);
      hash = Math.imul(hash, 16777619);
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1.0;

    // Also populate adjacent buckets for fuzzy semantic smoothness
    const idxNext = (idx + 1) % dim;
    vector[idxNext] += 0.5;
  }

  // Character 3-gram features for Arabic roots and morphological overlap
  for (let i = 0; i < cleanText.length - 2; i++) {
    const trigram = cleanText.substring(i, i + 3);
    let hash = 5381;
    for (let c = 0; c < trigram.length; c++) {
      hash = (hash * 33) ^ trigram.charCodeAt(c);
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 0.3;
  }

  // L2 normalize vector
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Main function to generate an embedding for a text chunk.
 * Uses OpenAI / Gemini if configured, otherwise falls back to local semantic embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKeyGemini = process.env.GEMINI_API_KEY;
  if (apiKeyGemini) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKeyGemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: text.substring(0, 8000) }] },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const embedding = data.embedding?.values;
        if (embedding) return embedding;
      }
    } catch (err) {
      console.warn('Gemini embedding error, falling back:', err);
    }
  }

  const apiKeyOpenAI = process.env.OPENAI_API_KEY;
  if (apiKeyOpenAI) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeyOpenAI}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }
    } catch (err) {
      console.warn('OpenAI embedding error, falling back to local embedding:', err);
    }
  }

  return generateLocalSemanticEmbedding(text);
}
