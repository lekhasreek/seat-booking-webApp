import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing'); // Debugging log
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing'); // Debugging log

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL must be set in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
