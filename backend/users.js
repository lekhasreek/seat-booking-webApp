// Backend logic for Users table
import { supabase } from '../src/frontend/supabaseClient';

export async function insertUser({ id, email, name }) {
  return await supabase.from('Users').insert([
    {
      User_id: id,
      email,
      Name: name
    }
  ]);
}

export async function upsertUser({ id, email, name }) {
  return await supabase.from('Users').upsert([
    {
      User_id: id,
      email,
      Name: name
    }
  ]);
}
