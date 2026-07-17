import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.');
}

// We use the Service Role Key here because the Next.js API route needs admin privileges
// to insert vectors and bypass RLS (if configured). 
// NEVER expose the Service Role Key to the client browser.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});
