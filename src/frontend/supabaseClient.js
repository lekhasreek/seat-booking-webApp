import { createClient } from '@supabase/supabase-js';

const apiUrl = import.meta.env.VITE_API_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// More detailed debugging
console.log('Environment Variables Debug:');
console.log('VITE_API_URL:', apiUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey);
console.log('All env vars:', import.meta.env);

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set in environment variables');
}

if (!supabaseKey || supabaseKey.trim() === '') {
  throw new Error('VITE_SUPABASE_ANON_KEY must be set in environment variables and cannot be empty');
}

// Create the Supabase client with the validated credentials
export const supabase = createClient(apiUrl, supabaseKey);
