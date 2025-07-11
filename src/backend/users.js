// Backend logic for Users table
import { supabase } from '../frontend/supabaseClient';

export async function insertUser({ id, email, name }) {
  return await supabase.from('Users').insert([
    {
      User_id: id,
      email,
      Name: name,
      encrypted_password: null
    }
  ]);
}

export async function upsertUser({ id, email, name }) {
  return await supabase.from('Users').upsert([
    {
      User_id: id,
      email,
      Name: name,
      encrypted_password: null
    }
  ]);
}
