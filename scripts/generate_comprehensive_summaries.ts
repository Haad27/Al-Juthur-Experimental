import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { getLexiconEntriesForRoot } from '../lib/lexicon/service';

require('dotenv').config({ path: '.env' });

const quranDbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'quran.db');
const outputPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'comprehensive_root_summaries.json');

// Delay helper to respect rate limits (e.g. 15 RPM = 4s delay)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runGenerator() {
    console.log("Starting comprehensive root summaries generation...");

    const quranDb = new Database(quranDbPath, { readonly: true });
    
    // 1. Get all unique roots
    const rootRows = quranDb.prepare("SELECT DISTINCT root FROM word_statistics WHERE root IS NOT NULL AND root != ''").all() as {root: string}[];
    const allRoots = rootRows.map(r => r.root);
    console.log(`Found ${allRoots.length} unique roots in the Quran.`);

    // 2. Load existing progress to allow resuming
    let existingData: Record<string, any> = {};
    if (fs.existsSync(outputPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            console.log(`Loaded ${Object.keys(existingData).length} existing summaries. Resuming...`);
        } catch (e) {
            console.error("Error reading existing output file, starting fresh.");
        }
    }

    const rootsToProcess = allRoots.filter(r => !existingData[r]);
    console.log(`${rootsToProcess.length} roots remaining to process.`);

    if (rootsToProcess.length === 0) {
        console.log("All roots have been processed!");
        return;
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("Error: GEMINI_API_KEY not found in .env");
        return;
    }

    const BATCH_SIZE = 10;
    
    for (let i = 0; i < rootsToProcess.length; i += BATCH_SIZE) {
        const batch = rootsToProcess.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(rootsToProcess.length/BATCH_SIZE)} (Roots: ${batch.join(', ')})`);

        let combinedClassicalText = "";
        for (const root of batch) {
            const result = getLexiconEntriesForRoot(root);
            let text = "";
            const mufradatEntry = result.entries.find(e => e.dictIdent === 'mufradat_alfajul_quran');
            if (mufradatEntry) text += "\\nSource: Al-Mufradat (Al-Raghib)\\n" + mufradatEntry.definitions.join('\\n');
            const lisanEntry = result.entries.find(e => e.dictIdent === 'lisanularab');
            if (lisanEntry) text += "\\nSource: Lisan al-Arab\\n" + lisanEntry.definitions.join('\\n');
            if (!text) text = JSON.stringify(result.entries);
            
            combinedClassicalText += `\n\n=== ROOT: ${root} ===\n${text.substring(0, 3000)}`;
        }

        const prompt = `
You are an expert in Classical Quranic Arabic. 
Below are the classical dictionary entries for ${batch.length} different Quranic roots. 

For EACH root, synthesize the classical definitions into a concise "Root & Word Family" summary.

CRITICAL CONSTRAINTS FOR EACH ROOT:
- Write exactly 2 paragraphs.
- Paragraph 1 (Root Word Meaning): Use SIMPLE, ACCESSIBLE ENGLISH VOCABULARY. Explain the core physical picture, the foundational meaning of the root, and linguistic nuances. Cite Al-Raghib (Mufradat) or Lisan al-Arab prominently.
- Paragraph 2 (Quranic Usage): MUST BE VERY CONCISE (equal in length to Paragraph 1). Use an ELEGANT, PROFOUND, and RICHLY ACADEMIC tone. Briefly explain how the root branches into its word family and give 1 or 2 specific Quranic examples. Start with a sentence similar to "From this semantic core, the Quranic lexicon richly develops..."
- Keep the Arabic transliterations and classical quotes. Do not simplify the Arabic terms.

OUTPUT FORMAT:
You MUST output a valid JSON array of objects.
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

        try {
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        response_mime_type: "application/json"
                    }
                })
            });

            const data = await res.json();
            if (!data.candidates || data.candidates.length === 0) {
                console.error("API Error Response:", JSON.stringify(data, null, 2));
                continue;
            }

            const text = data.candidates[0].content.parts[0].text;
            const cleanJsonStr = text.replace(/\\`\\`\\`json\\n|\\`\\`\\`/g, '').trim();
            
            try {
                const parsedArray = JSON.parse(cleanJsonStr);
                for (const item of parsedArray) {
                    if (item.root && item.root_meaning_html && item.quranic_usage_html) {
                        existingData[item.root] = {
                            root_meaning_html: item.root_meaning_html,
                            quranic_usage_html: item.quranic_usage_html
                        };
                    }
                }
                // Save progress
                fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
                console.log(`Saved batch successfully. Total processed: ${Object.keys(existingData).length}`);
            } catch (parseErr) {
                console.error("Failed to parse JSON response from AI. Raw text was:", text);
            }

        } catch (fetchErr) {
            console.error("Fetch Error:", fetchErr);
        }

        // Delay to respect rate limits (e.g. Gemini Flash Lite 15 RPM = 4 seconds per request)
        // Adding 5 seconds to be safe.
        await delay(5000);
    }

    console.log("Generation complete!");
}

runGenerator();
