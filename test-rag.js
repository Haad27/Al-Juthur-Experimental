const { prepareRagQuery } = require('./lib/ai/rag/query-router');
const { searchHybrid } = require('./lib/ai/rag/hybrid-search');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log('Testing LLM1...');
  const query = await prepareRagQuery('what does quran say about successful believers', 'default');
  console.log(JSON.stringify(query, null, 2));
  console.log('\\nTesting Hybrid Search...');
  const docs = await searchHybrid('what does quran say about successful believers', {
    mode: 'default',
    suggestedVerses: query.suggestedVerses
  }, 5);
  console.log('Docs returned:', docs.length);
  docs.forEach(d => console.log(d.id));
}
run();
