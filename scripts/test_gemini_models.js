require('dotenv').config();

async function testGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash',
    'gemini-3-flash'
  ];

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with OK." }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ ${m} SUCCESS:`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`❌ ${m} FAILED (${res.status}):`, data?.error?.message);
      }
    } catch (e) {
      console.log(`❌ ${m} ERROR:`, e.message);
    }
  }
}

testGeminiModels();
