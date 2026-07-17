import { pipeline } from '@xenova/transformers';

async function run() {
  console.log("Testing small model load...");
  try {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: false,
    });
    console.log("Success! Small model loaded.");
    const out = await extractor("test", { pooling: 'mean', normalize: true });
    console.log("Embedding size:", out.data.length);
  } catch (e: any) {
    console.error("Test failed:", e.message || e);
  }
}
run();
