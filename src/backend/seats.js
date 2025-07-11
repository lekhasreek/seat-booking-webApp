// Backend logic for Seats table
import { supabase } from '../frontend/supabaseClient';

export async function getAllSeats() {
  return await supabase.from('Seats').select('*');
}
