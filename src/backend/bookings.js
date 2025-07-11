// Backend logic for Bookings table
import { supabase } from '../frontend/supabaseClient';

export async function insertBooking(booking) {
  return await supabase.from('Bookings').insert([booking]);
}

export async function getBookingsByUser(userId) {
  return await supabase.from('Bookings').select('*').eq('User_id', userId);
}
