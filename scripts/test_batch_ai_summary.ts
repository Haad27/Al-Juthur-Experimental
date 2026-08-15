import { getLexiconEntriesForRoot } from '../lib/lexicon/service';
import fs from 'fs';
import fetch from 'node-fetch';

require('dotenv').config({ path: '.env' });

async function runTest() {
  const rootsToTest = ['سكن', 'ودد', 'رحم', 'قول', 'كتب', 'علم', 'بصر', 'سمع', 'حمد', 'غفر'];
  let combinedClassicalText = "";

  for (const root of rootsToTest) {
      const result = getLexiconEntriesForRoot(root);
      let text = "";
      
      const mufradatEntry = result.entries.find(e => e.dictIdent === 'mufradat_alfajul_quran');
      if (mufradatEntry) {
          text += "\\nSource: Al-Mufradat (Al-Raghib)\\n" + mufradatEntry.definitions.join('\\n');
      }

      const lisanEntry = result.entries.find(e => e.dictIdent === 'lisanularab');
      if (lisanEntry) {
          text += "\\nSource: Lisan al-Arab\\n" + lisanEntry.definitions.join('\\n');
      }

      if (!text) {
          text = JSON.stringify(result.entries);
      }
      
      combinedClassicalText += `\n\n=== ROOT: ${root} ===\n${text.substring(0, 3000)}`;
  }

const prompt = `
You are an expert in Classical Quranic Arabic. 
Below are the classical dictionary entries for 10 different Quranic roots. 

For EACH root, synthesize the classical definitions into a concise "Root & Word Family" summary.

CRITICAL CONSTRAINTS FOR EACH ROOT:
- Write exactly 2 paragraphs.
- Paragraph 1 (Root Word Meaning): Use SIMPLE, ACCESSIBLE ENGLISH VOCABULARY. Explain the core physical picture, the foundational meaning of the root, and linguistic nuances. Cite Al-Raghib (Mufradat) or Lisan al-Arab prominently.
- Paragraph 2 (Quranic Usage): MUST BE VERY CONCISE (equal in length to Paragraph 1). Use an ELEGANT, PROFOUND, and RICHLY ACADEMIC tone. Briefly explain how the root branches into its word family and give 1 or 2 specific Quranic examples. Start with a sentence similar to "From this semantic core, the Quranic lexicon richly develops..."
- Keep the Arabic transliterations and classical quotes. Do not simplify the Arabic terms.

OUTPUT FORMAT:
You MUST output a valid JSON array of objects. Do NOT use markdown code blocks like \`\`\`json, just output the raw JSON.
Example structure:
[
  {
    "root": "سكن",
    "root_meaning_html": "<p>...</p>",
    "quranic_usage_html": "<p>...</p>"
  }
]

Classical Arabic Source Texts:
${combinedClassicalText}
  `;

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
      console.error("No OpenRouter API key found");
      return;
  }

  try {
      console.log("Sending batch request of 10 roots to AI...");
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
            max_tokens: 6000
        })
      });
      const data = await res.json();
      if (!data.choices) {
          console.log("API Error Response:", JSON.stringify(data, null, 2));
          return;
      }
      const text = data.choices[0].message.content;
      
      // Try to parse the JSON and format it nicely in markdown for the user
      let mdOutput = "# Batch Test (10 Roots)\n\n";
      try {
          const cleanJsonStr = text.replace(/\\`\\`\\`json\\n|\\`\\`\\`/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);
          for (const item of parsed) {
              mdOutput += `## Root: ${item.root}\n\n`;
              mdOutput += `### Root Word Meaning\n${item.root_meaning_html.replace(/<p>|<\/p>/g, '')}\n\n`;
              mdOutput += `### Quranic Usage\n${item.quranic_usage_html.replace(/<p>|<\/p>/g, '')}\n\n`;
              mdOutput += `---\n\n`;
          }
      } catch (e) {
          mdOutput += "Failed to parse JSON. Raw output:\n\n" + text;
      }
      
      fs.writeFileSync('tmp_test_batch.md', mdOutput);
      console.log("Success! Output saved to tmp_test_batch.md");
  } catch (err) {
      console.error("API Error:", err);
  }
}

runTest();
