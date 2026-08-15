import { getLexiconEntriesForRoot } from '../lib/lexicon/service';
import fs from 'fs';
import fetch from 'node-fetch';

require('dotenv').config({ path: '.env' });

async function runTest() {
  const root = 'ودد';
  const result = getLexiconEntriesForRoot(root);
  
  let classicalArabicText = "";

  const mufradatEntry = result.entries.find(e => e.dictIdent === 'mufradat_alfajul_quran');
  if (mufradatEntry) {
      classicalArabicText += "\nSource: Al-Mufradat (Al-Raghib)\n" + mufradatEntry.definitions.join('\n');
  }

  const lisanEntry = result.entries.find(e => e.dictIdent === 'lisanularab');
  if (lisanEntry) {
      classicalArabicText += "\nSource: Lisan al-Arab\n" + lisanEntry.definitions.join('\n');
  }

  if (!classicalArabicText) {
      classicalArabicText = JSON.stringify(result.entries);
  }

const prompt = `
You are an expert in Classical Quranic Arabic. 
Read the following classical dictionary entries for the root "${root}". 
Synthesize these classical definitions into a concise "Root & Word Family" summary.

CRITICAL CONSTRAINTS:
- Use EXACTLY two headings: "### Root Word Meaning" and "### Quranic Usage".
- Under each heading, write EXACTLY 1 paragraph.
- BOTH paragraphs should be roughly EQUAL in length (very concise, about 3-5 sentences each).
- Keep the Arabic transliterations and classical quotes. Do not simplify the Arabic terms.

Structure & Tone:
- ### Root Word Meaning: Use SIMPLE, ACCESSIBLE ENGLISH VOCABULARY. Explain the core physical picture, the foundational meaning of the root, and linguistic nuances. Cite Al-Raghib (Mufradat) or Lisan al-Arab prominently. Make this easy for a high school student to read.
- ### Quranic Usage: MUST BE VERY CONCISE (do not write a massive paragraph, keep it as short as the first paragraph). Use an ELEGANT, PROFOUND, and RICHLY ACADEMIC tone. Briefly explain how the root branches into its word family (e.g. mawaddah, wadd, etc.) and give 1 or 2 specific Quranic examples. Start with a sentence similar to "From this semantic core, the Quranic lexicon richly develops..."

Classical Arabic Source Text:
${classicalArabicText.substring(0, 5000)}
  `;

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
      console.error("No OpenRouter API key found");
      return;
  }

  try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Tafsir App'
        },
        body: JSON.stringify({ 
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        })
      });
      const data = await res.json();
      if (!data.choices) {
          console.log("API Error Response:", JSON.stringify(data, null, 2));
          return;
      }
      const text = data.choices[0].message.content;
      
      fs.writeFileSync('tmp_test_skn.md', text);
      console.log("Success! Output saved to tmp_test_skn.md");
  } catch (err) {
      console.error("API Error:", err);
  }
}

runTest();
