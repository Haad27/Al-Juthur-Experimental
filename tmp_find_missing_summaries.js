const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const quranDbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'quran.db');
const laneJsonPath = path.join(
    process.cwd(),
    'database',
    'lexicon',
    'data',
    'quran-arabic-roots-lane-lexicon-main',
    'quran_arabic_roots_lane_lexicon_2026-02-12.json'
);

const quranDb = new Database(quranDbPath, { readonly: true });
const roots = quranDb.prepare("SELECT DISTINCT root FROM word_statistics WHERE root IS NOT NULL AND root != ''").all();

const laneData = JSON.parse(fs.readFileSync(laneJsonPath, 'utf8'));
const laneRootsMap = new Map();
for (const entry of laneData.roots) {
    laneRootsMap.set(entry.root, entry);
}

const missingSummaries = [];
const missingRoots = [];

for (const { root } of roots) {
    const compactRoot = root.replace(/\s+/g, '');
    const entry = laneRootsMap.get(compactRoot);
    if (!entry) {
        missingRoots.push(root);
    } else if (!entry.summary_en) {
        missingSummaries.push(root);
    }
}

const report = `
# Roots with no Lane's Lexicon entry at all: ${missingRoots.length}
${missingRoots.join(', ')}

# Roots with Lane's entry but no summary_en: ${missingSummaries.length}
${missingSummaries.join(', ')}
`;

fs.writeFileSync('missing_summaries_report.md', report);
console.log('Report generated.');
