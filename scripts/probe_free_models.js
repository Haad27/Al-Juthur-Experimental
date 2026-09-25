require('dotenv').config();

async function testFreeTierModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  // Test every candidate from your quota table
  const candidates = [
    'gemma-4-31b-it',
    'gemma-4-26b-a4b-it',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
  ];

  console.log('--- Probing Free Tier Candidate Models ---');
  for (const model of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ [AVAILABLE] ${model}`);
      } else {
        console.log(`❌ [HTTP ${res.status}] ${model}: ${data.error?.message?.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`❌ [ERROR] ${model}: ${e.message}`);
    }
  }
}

testFreeTierModels();
