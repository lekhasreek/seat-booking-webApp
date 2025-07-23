import { createClient } from '@supabase/supabase-js';

const apiUrl = process.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set in environment variables');
}

export const supabase = createClient(apiUrl, ''); // Empty key as backend handles auth
