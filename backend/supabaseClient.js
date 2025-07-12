import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// IMPORTANT: Use the Service Role Key for backend operations
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // <-- CHANGED THIS LINE

if (!supabaseUrl || !supabaseServiceRoleKey) { // <-- CHANGED THIS LINE
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables'); // <-- CHANGED THIS LINE
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey); // <-- CHANGED THIS LINE