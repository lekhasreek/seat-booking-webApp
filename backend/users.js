// Backend logic for Users tables
import { supabase } from './supabaseClient';

export async function insertUser({ id, email, name }) {
  return await supabase.from('Users').insert([
    {
      User_id: id,
      email,
      Name: name
    }
  ]);
}

export async function upsertUser({ id, email, name, vehicle_holder = false, vehicle_type = 'two' }) {
  return await supabase.from('Users').upsert([
    {
      User_id: id,
      email,
      Name: name,
      vehicle_holder,
      vehicle_type
    }
  ]);
}

export async function updateUserVehicleInfo({ id, vehicle_holder, vehicle_type }) {
  return await supabase.from('Users').update({
    vehicle_holder,
    vehicle_type
  }).eq('User_id', id);
}
