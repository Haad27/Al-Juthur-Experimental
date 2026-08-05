import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function minifyTextbook() {
  const inPath = path.join(process.cwd(), 'database', 'dream', 'dream_textbook.md');
  const outPath = path.join(process.cwd(), 'database', 'dream', 'dream_cheat_sheet.md');
  const chunksDir = path.join(process.cwd(), 'database', 'dream', 'cheat_chunks');
  
  if (!fs.existsSync(inPath)) {
    console.error('Original textbook not found at', inPath);
    process.exit(1);
  }
  
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  const content = fs.readFileSync(inPath, 'utf8');
  
  // Split by top-level headers to keep logical context together
  const rawSections = content.split(/^##\s+/m).filter(s => s.trim().length > 0);
  console.log(`Found ${rawSections.length} major sections in the original textbook.`);
  
  const systemPrompt = `You are an expert Arabic grammarian and curriculum designer. 
Your task is to take this section of the Bayyinah Dream Textbook and compress it into a highly dense "Grammar Cheat Sheet".

CRITICAL INSTRUCTIONS:
1. Extract the core grammar rules, definitions, morphological templates (Wazn), and formulas.
2. For EVERY concept or rule you extract, you MUST provide EXACTLY ONE clear example (with Arabic and translation) to demonstrate how the rule works. Do not provide zero examples, and do not provide 5 examples. Exactly ONE example per rule.
3. Omit all extraneous text, conversational explanations, drills, exercises, and redundant examples.
4. Preserve tables if they contain crucial paradigms (like conjugation tables).
5. Output purely in Markdown format (use ## and ### for headers). Do not include any conversational filler like "Here is the summary...".`;

  let totalBatches = rawSections.length;
  
  for (let i = 0; i < totalBatches; i++) {
    const chunkFile = path.join(chunksDir, `cheat_chunk_${i}.md`);
    if (fs.existsSync(chunkFile)) {
      console.log(`Skipping section ${i+1}/${totalBatches} (Already processed)`);
      continue;
    }
    
    console.log(`Processing section ${i+1}/${totalBatches}...`);
    
    // Add the "##" back since we split by it
    const sectionText = '## ' + rawSections[i];
    
    let success = false;
    let attempt = 0;
    
    while (!success && attempt < 3) {
      attempt++;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: [
            { text: systemPrompt },
            { text: `TEXTBOOK SECTION TO SUMMARIZE:\n\n${sectionText}` }
          ],
          config: {
            temperature: 0.1
          }
        });
        
        const summary = response.text || '';
        fs.writeFileSync(chunkFile, summary);
        console.log(`Successfully summarized section ${i+1}.`);
        success = true;
      } catch (e: any) {
        console.error(`Attempt ${attempt} failed:`, e?.message);
        if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          console.log('Rate limit hit. Waiting 35 seconds...');
          await new Promise(r => setTimeout(r, 35000));
        } else {
          console.log('Waiting 10s before retry...');
          await new Promise(r => setTimeout(r, 10000));
        }
      }
    }
    
    console.log('Waiting 5s for rate limit cooldown...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('--- Stitching cheat sheet together ---');
  let finalMarkdown = '# Bayyinah Dream Grammar Cheat Sheet\n\n';
  
  for (let i = 0; i < totalBatches; i++) {
    const chunkFile = path.join(chunksDir, `cheat_chunk_${i}.md`);
    if (fs.existsSync(chunkFile)) {
      const content = fs.readFileSync(chunkFile, 'utf8');
      finalMarkdown += `\n\n${content}`;
    }
  }
  
  fs.writeFileSync(outPath, finalMarkdown);
  console.log(`Done! Cheat Sheet written to ${outPath}`);
  console.log(`Original Size: ${(content.length / 1024).toFixed(2)} KB`);
  console.log(`Cheat Sheet Size: ${(finalMarkdown.length / 1024).toFixed(2)} KB`);
}

minifyTextbook().catch(console.error);
