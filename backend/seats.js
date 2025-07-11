// Backend logic for Seats table
import { supabase } from '../src/frontend/supabaseClient';

export async function getAllSeats() {
  return await supabase.from('Seats').select('*');
}
