const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] })
  });
  console.log(res.status, await res.text());
}
run();
