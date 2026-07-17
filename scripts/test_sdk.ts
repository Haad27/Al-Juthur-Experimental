import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: 'test',
    });
    console.log("Success! Embedding length:", response.embeddings?.[0]?.values?.length);
  } catch (e: any) {
    console.error("SDK Error:", e.message || e);
  }
}
run();
