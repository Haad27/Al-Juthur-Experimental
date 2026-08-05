import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// Load .env if running standalone
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function processPdf() {
  const pdfPath = path.join(process.cwd(), 'database', 'dream', '-Dream-Textbook.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const numPages = pdfDoc.getPageCount();
  
  const outPath = path.join(process.cwd(), 'database', 'dream', 'dream_textbook.md');
  const tempDir = path.join(process.cwd(), 'database', 'dream', 'temp');
  const chunksDir = path.join(process.cwd(), 'database', 'dream', 'chunks');
  
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(chunksDir)) fs.mkdirSync(chunksDir, { recursive: true });
  
  console.log(`Loaded PDF with ${numPages} pages.`);
  
  const batchSize = 10;
  const limit = numPages;

  for (let i = 0; i < limit; i += batchSize) {
    const end = Math.min(i + batchSize, numPages);
    const chunkMdPath = path.join(chunksDir, `pages_${i + 1}_to_${end}.md`);

    // Skip if we already successfully generated this chunk
    if (fs.existsSync(chunkMdPath)) {
      console.log(`Skipping pages ${i + 1} to ${end} (Already processed).`);
      continue;
    }

    console.log(`Processing pages ${i + 1} to ${end}...`);
    
    // Create new PDF for this batch
    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(pdfDoc, Array.from({length: end - i}, (_, j) => i + j));
    copiedPages.forEach((page) => chunkDoc.addPage(page));
    
    const chunkBytes = await chunkDoc.save();
    const tempPath = path.join(tempDir, `temp_chunk_${i}.pdf`);
    fs.writeFileSync(tempPath, chunkBytes);
    
    // Upload to Gemini
    let uploadResult;
    try {
      uploadResult = await ai.files.upload({
        file: tempPath,
        mimeType: 'application/pdf',
        displayName: `Dream Textbook Pages ${i + 1}-${end}`
      });
      console.log(`Uploaded file: ${uploadResult.name}`);
    } catch (e: any) {
      console.error(`Upload failed: ${e.message}`);
      fs.unlinkSync(tempPath);
      continue;
    }
    
    // Wait for processing
    let fileState = await ai.files.get({ name: uploadResult.name });
    while (fileState.state === 'PROCESSING') {
      console.log('Waiting for file processing...');
      await new Promise(r => setTimeout(r, 2000));
      fileState = await ai.files.get({ name: uploadResult.name });
    }
    
    if (fileState.state === 'FAILED') {
      console.error(`File processing failed for pages ${i+1}-${end}`);
      fs.unlinkSync(tempPath);
      continue;
    }
    
    const prompt = `You are an expert Arabic linguist and curriculum designer. 
Convert the attached pages from this Arabic grammar textbook into clean, highly structured Markdown.

CRITICAL INSTRUCTIONS:
1. Preserve all tables using Markdown table syntax.
2. Preserve all Arabic text perfectly, including harakat (vowel marks).
3. Use ## for Chapter headers and ### for Section headers.
4. DO NOT summarize. Transcribe the text completely but format it cleanly.
5. EXTREMELY IMPORTANT: OMIT any "DRILL" sections. Do not include drills, questions, or blank lines meant for students to fill out. Only extract the core grammar lessons, rules, and vocabulary charts.
6. Only return the markdown content, no conversational filler.`;

    let success = false;
    let attempt = 0;
    
    while (!success && attempt < 3) {
      attempt++;
      try {
        console.log(`Generating content (Attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: [
            { fileData: { fileUri: uploadResult.uri, mimeType: 'application/pdf' } },
            { text: prompt }
          ]
        });
        
        const md = response.text || '';
        fs.writeFileSync(chunkMdPath, md);
        console.log(`Successfully saved pages ${i + 1}-${end}.`);
        success = true;
      } catch (e: any) {
        console.error(`Generation failed for pages ${i + 1}-${end}:`, e?.message);
        if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
          console.log('Rate limit hit. Waiting 35 seconds before retrying...');
          await new Promise(r => setTimeout(r, 35000));
        } else {
          break; // Don't retry on fatal errors (e.g., 400 Bad Request)
        }
      }
    }
    
    // Cleanup
    try {
      await ai.files.delete({ name: uploadResult.name });
    } catch (e) {}
    fs.unlinkSync(tempPath);
    
    // Sleep to avoid hitting RPM limits even on success
    console.log('Waiting 5s for rate limit cooldown...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('--- Stitching chunks together ---');
  let finalMarkdown = '';
  for (let i = 0; i < limit; i += batchSize) {
    const end = Math.min(i + batchSize, numPages);
    const chunkMdPath = path.join(chunksDir, `pages_${i + 1}_to_${end}.md`);
    if (fs.existsSync(chunkMdPath)) {
      const content = fs.readFileSync(chunkMdPath, 'utf8');
      finalMarkdown += `\n\n<!-- Pages ${i+1}-${end} -->\n\n` + content;
    } else {
      console.warn(`WARNING: Missing chunk for pages ${i+1}-${end}`);
    }
  }
  
  fs.writeFileSync(outPath, finalMarkdown);
  console.log('Done processing PDF! Final file written to dream_textbook.md');
}

processPdf().catch(console.error);
