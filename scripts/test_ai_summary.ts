import { getLexiconEntriesForRoot } from '../lib/lexicon/service';
import fs from 'fs';
import fetch from 'node-fetch';

require('dotenv').config({ path: '.env' });

async function runTest() {
  const root = 'سكن';
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
- The total length should be concise but profoundly academic.
- USE SIMPLE, ACCESSIBLE ENGLISH VOCABULARY. Do NOT use overly complex, dense, or archaic English words (e.g., instead of "cessation of motion", say "stopping of movement"). Make it easy for a high school student to read.
- However, you MUST keep the Arabic transliterations and classical quotes (e.g., keep phrases like "sakana fulān makān kadhā"). Do not simplify the Arabic, only the English explanations.

Structure:
- ### Root Word Meaning (approx 70% of the content): A deep dive into the classical lexicon meaning. Explain the core physical picture, the foundational meaning of the root, and linguistic nuances. Cite Al-Raghib (Mufradat) or Lisan al-Arab prominently.
- ### Quranic Usage (approx 30% of the content): How the Quran uses this root and how it branches into its word family. Give a few specific Quranic examples of these derived words (like sakanan, sakun, maskanah, etc.).

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
