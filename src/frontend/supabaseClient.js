import { createClient } from '@supabase/supabase-js';

const apiUrl = import.meta.env.VITE_API_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('VITE_API_URL:', apiUrl); // Debugging log
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Present' : 'Missing'); // Debugging log

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set in environment variables');
}

if (!supabaseKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY must be set in environment variables');
}

export const supabase = createClient(apiUrl, supabaseKey);
