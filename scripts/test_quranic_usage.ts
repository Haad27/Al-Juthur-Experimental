import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// We need getLexiconEntriesForRoot logic here for the classical text.
// We'll do a simplified version just to get the raw text for the prompt.

const lexiconsDb = new Database(path.join(process.cwd(), 'database', 'lexicon', 'data', 'arabic_lexicons.sqlite'), { readonly: true });
const comprehensiveDataPath = path.join(process.cwd(), 'database', 'lexicon', 'data', 'comprehensive_root_summaries.json');

const rawData = JSON.parse(fs.readFileSync(comprehensiveDataPath, 'utf-8'));

const testRoots = ['رحم', 'علم', 'كتب'];

function getClassicalText(root: string) {
    let text = "";
    
    // Mufradat
    try {
        const row = lexiconsDb.prepare(`SELECT meanings FROM mufradat_alfajul_quran WHERE word = ?`).get(root) as any;
        if (row && row.meanings) text += "\nSource: Al-Mufradat (Al-Raghib)\n" + row.meanings;
    } catch(e) {}
    
    // Lisan
    try {
        const row = lexiconsDb.prepare(`SELECT meanings FROM lisanularab WHERE word = ?`).get(root) as any;
        if (row && row.meanings) text += "\nSource: Lisan al-Arab\n" + row.meanings;
    } catch(e) {}

    return text.substring(0, 3000); // limit length
}

async function runTest() {
    const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No API key");

    console.log("Starting test generation for Quranic Usage on roots:", testRoots.join(", "));

    let promptItems = "";
    for (const root of testRoots) {
        const classical = getClassicalText(root);
        const existingRootMeaning = rawData[root]?.root_meaning_html || "";
        promptItems += `
=== ROOT: ${root} ===
Existing Root Meaning (DO NOT CHANGE):
${existingRootMeaning}

Classical Arabic Source Texts for reference:
${classical}

`;
    }

    const prompt = `
You are an expert in Classical Quranic Arabic. 
Below is data for ${testRoots.length} different Quranic roots. 

Your task is to generate ONLY the "Quranic Usage" paragraph for each root.
The user loved an earlier test you did that looked like this:
"applying the notions of dwelling, tranquility, and the cessation of motion to both physical and spiritual states. The verb سَكَنَ (sakana) and its derivatives are frequently employed to denote residence, as in ﴿لا يُرى إِلَّا مَساكِنُهُمْ﴾ [Al-Ahqaf: 25], referring to their dwellings. Beyond the physical, it speaks to inner peace and divine solace, epitomized by السَّكِينَةُ (sakīnah), a profound sense of tranquility or peace of mind granted by God, as seen in ﴿أَنْزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ﴾ [Al-Fath: 4]. The root also encompasses the concept of the vulnerable or destitute, الْمسْكِينُ (al-miskīn), whose state of need often implies a lack of stability or settledness in life."

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
    "root": "رحم",
    "quranic_usage_html": "<p>...</p>"
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
        const text = data.candidates[0].content.parts[0].text;
        const cleanJsonStr = text.replace(/\`\`\`json\n|\`\`\`/g, '').trim();
        const parsedArray = JSON.parse(cleanJsonStr);
        
        console.log("\n====== RESULTS ======\n");
        for (const item of parsedArray) {
            console.log(`ROOT: ${item.root}`);
            console.log(`QURANIC USAGE:\n${item.quranic_usage_html.replace(/<p>|<\/p>/g, '')}\n`);
        }
        
    } catch (e) {
        console.error("Error:", e);
    }
}

runTest();
