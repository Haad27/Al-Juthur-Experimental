require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Connecting to Turso...');
  
  // 1. Create AiRootSummary table
  console.log('Creating ai_root_summary table...');
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS ai_root_summary (
      root TEXT PRIMARY KEY,
      root_meaning_html TEXT,
      quranic_usage_html TEXT
    )
  `);

  // Load comprehensive_root_summaries.json
  const aiPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'comprehensive_root_summaries.json');
  if (fs.existsSync(aiPath)) {
    const aiData = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
    const roots = Object.keys(aiData);
    console.log(`Found ${roots.length} AI Summaries. Inserting...`);
    
    // Batch insert
    const BATCH_SIZE = 50;
    for (let i = 0; i < roots.length; i += BATCH_SIZE) {
      const batch = roots.slice(i, i + BATCH_SIZE);
      const values = [];
      const args = [];
      batch.forEach(root => {
        values.push('(?, ?, ?)');
        args.push(root, aiData[root].root_meaning_html || '', aiData[root].quranic_usage_html || '');
      });
      if (values.length > 0) {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO ai_root_summary (root, root_meaning_html, quranic_usage_html) VALUES ${values.join(', ')}`,
          args
        });
      }
      process.stdout.write(`\rInserted ${Math.min(i + BATCH_SIZE, roots.length)} / ${roots.length} AI Summaries...`);
    }
    console.log('\nAI Summaries Migration complete!');
  } else {
    console.log('AI Summaries file not found.');
  }

  // 2. Create structured_lane table
  console.log('\nCreating structured_lane table...');
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS structured_lane (
      root TEXT PRIMARY KEY,
      root_buckwalter TEXT,
      definition_en TEXT,
      summary_en TEXT,
      summary_tr TEXT,
      quran_frequency INTEGER,
      morphological_forms TEXT
    )
  `);

  const lanePath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'quran-arabic-roots-lane-lexicon-main', 'quran_arabic_roots_lane_lexicon_2026-02-12.json');
  if (fs.existsSync(lanePath)) {
    const laneData = JSON.parse(fs.readFileSync(lanePath, 'utf8')).roots || [];
    console.log(`Found ${laneData.length} Structured Lane Roots. Inserting...`);
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < laneData.length; i += BATCH_SIZE) {
      const batch = laneData.slice(i, i + BATCH_SIZE);
      const values = [];
      const args = [];
      batch.forEach(item => {
        values.push('(?, ?, ?, ?, ?, ?, ?)');
        args.push(
          item.root || '',
          item.root_buckwalter || '',
          item.definition_en || '',
          item.summary_en || '',
          item.summary_tr || '',
          item.quran_frequency || 0,
          JSON.stringify(item.morphological_forms || [])
        );
      });
      if (values.length > 0) {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO structured_lane (root, root_buckwalter, definition_en, summary_en, summary_tr, quran_frequency, morphological_forms) VALUES ${values.join(', ')}`,
          args
        });
      }
      process.stdout.write(`\rInserted ${Math.min(i + BATCH_SIZE, laneData.length)} / ${laneData.length} Structured Lane Roots...`);
    }
    console.log('\nStructured Lane Migration complete!');
  } else {
    console.log('Structured Lane file not found.');
  }

  console.log('\n✅ ALL JSON DATA MIGRATED TO TURSO!');
}

main().catch(console.error);
