require('dotenv').config();

async function testAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemma-2-27b-it',
    'gemma-2-9b-it'
  ];

  console.log('Testing available models on your API key...');
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with 1 word: OK" }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ ${m} AVAILABLE (Status 200):`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`❌ ${m} (${res.status}):`, data?.error?.message);
      }
    } catch (e) {
      console.log(`❌ ${m} ERROR:`, e.message);
    }
  }
}

testAllModels();
