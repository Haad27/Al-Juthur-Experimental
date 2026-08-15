import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const BATCH_SIZE = 10;
const DELAY_MS = 5000; // 5 seconds to stay under 15 RPM

const lexiconsDbPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'arabic_lexicons.sqlite');
const lexiconsDb = new Database(lexiconsDbPath, { readonly: true });
const comprehensiveDataPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'comprehensive_root_summaries.json');

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getClassicalText(root: string) {
    let text = "";
    try {
        const row = lexiconsDb.prepare(`SELECT meanings FROM mufradat_alfajul_quran WHERE word = ?`).get(root) as any;
        if (row && row.meanings) text += "\nSource: Al-Mufradat (Al-Raghib)\n" + row.meanings;
    } catch(e) {}
    try {
        const row = lexiconsDb.prepare(`SELECT meanings FROM lisanularab WHERE word = ?`).get(root) as any;
        if (row && row.meanings) text += "\nSource: Lisan al-Arab\n" + row.meanings;
    } catch(e) {}
    return text.substring(0, 3000); 
}

async function runGenerator() {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No API key found in .env");

    let existingData: Record<string, {root_meaning_html: string, quranic_usage_html: string}> = {};
    if (fs.existsSync(comprehensiveDataPath)) {
        existingData = JSON.parse(fs.readFileSync(comprehensiveDataPath, 'utf-8'));
    }

    const allRoots = Object.keys(existingData);
    console.log(`Loaded ${allRoots.length} total roots.`);

    // Find roots that need regeneration (those that don't have <ul> in their quranic usage)
    const rootsToProcess = allRoots.filter(r => !existingData[r].quranic_usage_html.includes('<ul'));
    console.log(`${rootsToProcess.length} roots remaining to regenerate Quranic Usage.`);

    for (let i = 0; i < rootsToProcess.length; i += BATCH_SIZE) {
        const batch = rootsToProcess.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(rootsToProcess.length/BATCH_SIZE)} (Roots: ${batch.join(', ')})`);

        let promptItems = "";
        for (const root of batch) {
            const classical = getClassicalText(root);
            promptItems += `\n=== ROOT: ${root} ===\nExisting Meaning: ${existingData[root].root_meaning_html}\nClassical: ${classical}\n`;
        }

        const prompt = `
You are an expert in Classical Quranic Arabic. 
Below is data for ${batch.length} different Quranic roots. 

Your task is to generate ONLY the "Quranic Usage" paragraph for each root.

CRITICAL CONSTRAINTS FOR QURANIC USAGE:
- NEVER write introductory or concluding sentences.
- Jump IMMEDIATELY into an HTML unordered list (<ul>).
- Provide 3-4 distinct categories of usage. For each category, create a list item (<li>) using this exact structure:
  "<li><b>[Concept Name]:</b> ﴿[Arabic snippet]﴾ <em>([English translation])</em> [Surah:Ayah].</li>"
- Example: "<li><b>Divine Omniscience:</b> ﴿عَلَّامُ الْغُيُوبِ﴾ <em>(Knower of the unseen)</em> [Al-Ma'idah: 109].</li>"
- You are allowed to make it a bit longer to adequately cover the concepts and translations, but remain focused strictly on verses.
- Wrap the entire output in <ul>...</ul> (do not wrap the whole thing in <p>).

OUTPUT FORMAT:
You MUST output a valid JSON array of objects.
Example structure:
[
  {
    "root": "${batch[0]}",
    "quranic_usage_html": "<ul><li>...</li></ul>"
  }
]

DATA:
${promptItems}
        `;

        try {
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + key, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                })
            });

            const data = await res.json();
            if (data.error) {
                console.error("API Error Response:", JSON.stringify(data.error, null, 2));
                continue;
            }

            const text = data.candidates[0].content.parts[0].text;
            const cleanJsonStr = text.replace(/\`\`\`json\n|\`\`\`/g, '').trim();
            
            try {
                const parsedArray = JSON.parse(cleanJsonStr);
                for (const item of parsedArray) {
                    if (item.root && item.quranic_usage_html && existingData[item.root]) {
                        // Keep the original root meaning!
                        existingData[item.root].quranic_usage_html = item.quranic_usage_html;
                    }
                }
                fs.writeFileSync(comprehensiveDataPath, JSON.stringify(existingData, null, 2));
                console.log(`Saved batch. Remaining to process: ${rootsToProcess.length - (i + BATCH_SIZE > rootsToProcess.length ? rootsToProcess.length : i + BATCH_SIZE)}`);
            } catch (parseErr) {
                console.error("Failed to parse JSON response:", text);
            }
        } catch (fetchErr) {
            console.error("Fetch Error:", fetchErr);
        }

        await delay(DELAY_MS);
    }

    console.log("Quranic Usage regeneration complete!");
}

runGenerator();
