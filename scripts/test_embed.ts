import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const geminiApiKey = process.env.GEMINI_API_KEY;

async function testEmbedding(model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${geminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: "test" }] }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error(`Error for ${model}:`, JSON.stringify(data));
  } else {
    console.log(`Success for ${model}! Embedding length: ${data.embedding?.values?.length}`);
  }
}

async function run() {
  await testEmbedding('text-embedding-004');
  await testEmbedding('embedding-001');
}

run();
