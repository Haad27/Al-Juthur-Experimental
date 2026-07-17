import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing keys");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing insert...");
  // Create a 384-dimensional dummy vector
  const embedding = Array(384).fill(0.1);
  const { data, error } = await supabase.from('rag_documents').insert({
    content: "Test text",
    embedding: embedding,
    metadata: { test: true }
  }).select();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert succeeded!", data);
  }
}
run();
