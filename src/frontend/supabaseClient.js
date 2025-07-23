import { createClient } from '@supabase/supabase-js';

const apiUrl = import.meta.env.VITE_API_URL;

console.log('VITE_API_URL:', apiUrl); // Debugging log

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set in environment variables');
}

export const supabase = createClient(apiUrl, ''); // Empty key as backend handles auth
