import surahThematicOutlineData from "@/database/topics/surah_thematic_outline.json";
import ayahTopicTaxonomyData from "@/database/topics/ayah_topic_taxonomy.json";
import tafsirHeadingsData from "@/database/topics/tafsir_headings_index.json";

export interface ThematicSection {
  surahId: number;
  fromAyah: number;
  toAyah: number;
  rangeStr: string;
  description: string;
}

export interface TopicSearchResult {
  id: string;
  surahId: number;
  ayahNumber: number;
  toAyah?: number;
  title: string;
  category?: string;
  snippet: string;
  matchType: "theme" | "concept" | "heading" | "commentary" | "verse_text";
  relevanceScore: number;
}

// Type assertions for statically loaded JSON
const thematicOutline = surahThematicOutlineData as Record<
  string,
  {
    surahNumber: number;
    surahName: string;
    shortText: string;
    thematicSections: ThematicSection[];
  }
>;

const taxonomy = ayahTopicTaxonomyData as {
  topics: {
    topic: string;
    category: string;
    keywords: string[];
    verses: { surah: number; from: number; to: number }[];
    expandedVerses: { surah: number; ayah: number }[];
  }[];
  ayahIndex: Record<string, { topic: string; category: string }[]>;
};

const headings = tafsirHeadingsData as {
  folder: string;
  surahId: number;
  ayahId: number;
  heading: string;
}[];

/**
 * Normalizes query string for uniform matching (strips diacritics, lowercase, removes punctuation)
 */
export function normalizeQuery(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns the curated thematic outline and verse ranges for a given Surah.
 */
export function getSurahThematicOutline(surahId: number): ThematicSection[] {
  const surahInfo = thematicOutline[String(surahId)] || thematicOutline[surahId];
  return surahInfo?.thematicSections || [];
}

/**
 * Returns all top-level topics available across the taxonomy for quick chip recommendations.
 */
export function getAllTaxonomyTopics(): { topic: string; category: string }[] {
  return taxonomy.topics.map(t => ({ topic: t.topic, category: t.category }));
}

/**
 * Extracts a concise snippet around matching keywords.
 */
export function extractSnippetAroundKeyword(text: string, query: string, maxLength = 160): string {
  if (!text) return "";
  const clean = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lowerClean = clean.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  let matchIndex = -1;

  for (const w of [lowerQuery, ...words]) {
    const idx = lowerClean.indexOf(w);
    if (idx !== -1) {
      matchIndex = idx;
      break;
    }
  }

  if (matchIndex === -1) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(clean.length, matchIndex + maxLength - 40);
  let snippet = clean.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < clean.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Searches topics in Surah Mode.
 * Checks:
 * 1. Curated Thematic Blocks
 * 2. Pre-indexed Ayah Topic Taxonomy
 * 3. Verse translation texts (if loadedAyahs are provided)
 */
export function searchSurahTopics(
  surahId: number,
  rawQuery: string,
  loadedAyahs?: { numberInSurah: number; translation?: string; text?: string }[]
): TopicSearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const queryTerms = query.split(" ").filter(t => t.length > 1);
  const results: TopicSearchResult[] = [];
  const seenAyahs = new Set<number>();

  // 1. Check Curated Thematic Blocks for this Surah
  const sections = getSurahThematicOutline(surahId);
  for (const sec of sections) {
    const descLower = sec.description.toLowerCase();
    let matches = false;
    let score = 0;

    if (descLower.includes(query)) {
      matches = true;
      score += 60;
    } else {
      const matchedTerms = queryTerms.filter(t => descLower.includes(t));
      if (matchedTerms.length > 0) {
        matches = true;
        score += matchedTerms.length * 20;
      }
    }

    if (matches) {
      results.push({
        id: `theme-${sec.surahId}-${sec.fromAyah}-${sec.toAyah}`,
        surahId: sec.surahId,
        ayahNumber: sec.fromAyah,
        toAyah: sec.toAyah > sec.fromAyah ? sec.toAyah : undefined,
        title: `Thematic Section (Ayah ${sec.rangeStr})`,
        category: "Surah Theme",
        snippet: extractSnippetAroundKeyword(sec.description, query),
        matchType: "theme",
        relevanceScore: score,
      });

      for (let a = sec.fromAyah; a <= sec.toAyah; a++) {
        seenAyahs.add(a);
      }
    }
  }

  // 2. Check Ayah Topic Taxonomy for this Surah
  for (const topicItem of taxonomy.topics) {
    const topicLower = topicItem.topic.toLowerCase();
    const catLower = topicItem.category.toLowerCase();
    const keywordsLower = topicItem.keywords.map(k => k.toLowerCase());

    let topicScore = 0;
    if (topicLower.includes(query)) {
      topicScore += 80;
    } else if (keywordsLower.some(k => k.includes(query) || query.includes(k))) {
      topicScore += 65;
    } else {
      const matchCount = queryTerms.filter(t => 
        topicLower.includes(t) || keywordsLower.some(k => k.includes(t)) || catLower.includes(t)
      ).length;
      if (matchCount > 0) {
        topicScore += matchCount * 25;
      }
    }

    if (topicScore > 0) {
      // Find verses for this topic that belong to the current Surah
      const matchingVerses = topicItem.expandedVerses.filter(v => v.surah === surahId);
      for (const v of matchingVerses) {
        if (!seenAyahs.has(v.ayah)) {
          results.push({
            id: `concept-${surahId}-${v.ayah}-${topicItem.topic}`,
            surahId,
            ayahNumber: v.ayah,
            title: topicItem.topic,
            category: topicItem.category,
            snippet: `Discusses ${topicItem.topic} (${topicItem.category})`,
            matchType: "concept",
            relevanceScore: topicScore,
          });
          seenAyahs.add(v.ayah);
        }
      }
    }
  }

  // 3. Check loaded verse translations (if passed)
  if (Array.isArray(loadedAyahs)) {
    for (const ayah of loadedAyahs) {
      if (seenAyahs.has(ayah.numberInSurah)) continue;
      const transText = ayah.translation || "";
      const transLower = transText.toLowerCase();

      let transScore = 0;
      if (transLower.includes(query)) {
        transScore += 40;
      } else {
        const matchedTerms = queryTerms.filter(t => transLower.includes(t));
        if (matchedTerms.length === queryTerms.length && queryTerms.length > 0) {
          transScore += 30;
        } else if (matchedTerms.length > 0) {
          transScore += matchedTerms.length * 8;
        }
      }

      if (transScore >= 20) {
        results.push({
          id: `verse-${surahId}-${ayah.numberInSurah}`,
          surahId,
          ayahNumber: ayah.numberInSurah,
          title: `Ayah ${ayah.numberInSurah}`,
          category: "Verse Translation",
          snippet: extractSnippetAroundKeyword(transText, query),
          matchType: "verse_text",
          relevanceScore: transScore,
        });
      }
    }
  }

  // Sort by relevance score descending
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Searches topics in Tafsir Mode.
 * Directly searches:
 * 1. Pre-extracted Tafsir Section Headings for this Surah
 * 2. Curated Thematic sections for this Surah
 * 3. Topic Taxonomy for this Surah
 * 4. The currently loaded Tafsir commentary text (loadedTafsir)
 */
export function searchTafsirTopics(
  surahId: number,
  _authorId: number | null,
  rawQuery: string,
  loadedTafsir: Record<number, any>
): TopicSearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const queryTerms = query.split(" ").filter(t => t.length > 1);
  const results: TopicSearchResult[] = [];
  const matchedAyahMap = new Map<number, TopicSearchResult>();

  // 1. Scan pre-extracted Tafsir <h2> section headings for this Surah
  const surahHeadings = headings.filter(h => h.surahId === surahId);
  for (const h of surahHeadings) {
    const headingClean = h.heading.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const headingLower = headingClean.toLowerCase();

    let headingScore = 0;
    if (headingLower.includes(query)) {
      headingScore = 110;
    } else {
      const matched = queryTerms.filter(t => headingLower.includes(t));
      if (matched.length === queryTerms.length && queryTerms.length > 0) {
        headingScore = 90;
      } else if (matched.length > 0) {
        headingScore = matched.length * 30;
      }
    }

    if (headingScore >= 30) {
      matchedAyahMap.set(h.ayahId, {
        id: `heading-${surahId}-${h.ayahId}-${h.heading.slice(0, 20)}`,
        surahId,
        ayahNumber: h.ayahId,
        title: headingClean,
        category: "Tafsir Section Heading",
        snippet: `Section heading for Ayah ${h.ayahId}: "${headingClean}"`,
        matchType: "heading",
        relevanceScore: headingScore,
      });
    }
  }

  // 2. Find matches in the active commentary entries (loadedTafsir)
  const tafsirEntries = Object.values(loadedTafsir || {});
  for (const entry of tafsirEntries) {
    const ayahNum = entry.ayahId || entry.ayah?.numberInSurah;
    if (!ayahNum) continue;

    const fullText = entry.text || "";
    // Clean text to search headings and body
    const cleanText = fullText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const textLower = cleanText.toLowerCase();

    // Check if any in-text <h2> heading in this commentary matches
    const h2Matches = [...fullText.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
    let headingMatchTitle = "";
    for (const hMatch of h2Matches) {
      const heading = hMatch[1].replace(/<[^>]+>/g, "").trim();
      if (heading.toLowerCase().includes(query)) {
        headingMatchTitle = heading;
        break;
      }
    }

    let score = 0;
    if (headingMatchTitle) {
      score += 100;
    } else if (textLower.includes(query)) {
      score += 55;
    } else {
      const matchedTerms = queryTerms.filter(t => textLower.includes(t));
      if (matchedTerms.length === queryTerms.length && queryTerms.length > 0) {
        score += 40;
      } else if (matchedTerms.length > 0) {
        score += matchedTerms.length * 12;
      }
    }

    if (score >= 24) {
      const existing = matchedAyahMap.get(ayahNum);
      if (!existing || existing.relevanceScore < score) {
        matchedAyahMap.set(ayahNum, {
          id: `tafsir-entry-${surahId}-${ayahNum}`,
          surahId,
          ayahNumber: ayahNum,
          title: headingMatchTitle || `Ayah ${ayahNum} Commentary`,
          category: headingMatchTitle ? "Commentary Heading" : "Commentary Discussion",
          snippet: extractSnippetAroundKeyword(cleanText, query),
          matchType: "commentary",
          relevanceScore: score,
        });
      }
    }
  }

  // 3. Also incorporate Curated Themes for this Surah
  const sections = getSurahThematicOutline(surahId);
  for (const sec of sections) {
    const descLower = sec.description.toLowerCase();
    let matches = false;
    let score = 0;

    if (descLower.includes(query)) {
      matches = true;
      score += 50;
    } else {
      const matchedTerms = queryTerms.filter(t => descLower.includes(t));
      if (matchedTerms.length > 0) {
        matches = true;
        score += matchedTerms.length * 15;
      }
    }

    if (matches) {
      const existing = matchedAyahMap.get(sec.fromAyah);
      if (!existing || existing.relevanceScore < score) {
        matchedAyahMap.set(sec.fromAyah, {
          id: `theme-tafsir-${sec.surahId}-${sec.fromAyah}`,
          surahId: sec.surahId,
          ayahNumber: sec.fromAyah,
          toAyah: sec.toAyah > sec.fromAyah ? sec.toAyah : undefined,
          title: `Thematic Subject: Ayah ${sec.rangeStr}`,
          category: "Theme of Surah",
          snippet: extractSnippetAroundKeyword(sec.description, query),
          matchType: "theme",
          relevanceScore: score,
        });
      }
    }
  }

  // 4. Also incorporate Ayah Topic Taxonomy for this Surah
  for (const topicItem of taxonomy.topics) {
    const topicLower = topicItem.topic.toLowerCase();
    const keywordsLower = topicItem.keywords.map(k => k.toLowerCase());

    let topicScore = 0;
    if (topicLower.includes(query)) {
      topicScore += 75;
    } else if (keywordsLower.some(k => k.includes(query))) {
      topicScore += 55;
    } else {
      const matchCount = queryTerms.filter(t => 
        topicLower.includes(t) || keywordsLower.some(k => k.includes(t))
      ).length;
      if (matchCount > 0) topicScore += matchCount * 20;
    }

    if (topicScore > 0) {
      const matchingVerses = topicItem.expandedVerses.filter(v => v.surah === surahId);
      for (const v of matchingVerses) {
        const existing = matchedAyahMap.get(v.ayah);
        if (!existing) {
          matchedAyahMap.set(v.ayah, {
            id: `concept-tafsir-${surahId}-${v.ayah}-${topicItem.topic}`,
            surahId,
            ayahNumber: v.ayah,
            title: topicItem.topic,
            category: topicItem.category,
            snippet: `Ayah ${v.ayah} addresses ${topicItem.topic} (${topicItem.category}) in this commentary.`,
            matchType: "concept",
            relevanceScore: topicScore,
          });
        }
      }
    }
  }

  for (const item of matchedAyahMap.values()) {
    results.push(item);
  }

  // Sort results by relevance score descending
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
