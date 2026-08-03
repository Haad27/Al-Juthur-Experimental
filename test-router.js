const { prepareRagQuery } = require('./lib/ai/rag/query-router');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log('Testing LLM1...');
  const query = await prepareRagQuery('what does quran say about successful believers', 'default');
  console.log(JSON.stringify(query, null, 2));
}
run();
