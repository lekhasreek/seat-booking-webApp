// Backend logic for Bookings table
// All functions now call the backend Express API instead of Supabase directly
const API_BASE = 'http://localhost:4000/api/bookings';

export async function insertBooking(booking) {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!res.ok) throw new Error('Failed to insert booking');
  return await res.json();
}

export async function getBookingsByUser(userId) {
  const res = await fetch(`${API_BASE}/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch bookings by user');
  return await res.json();
}

export async function getBookedSeatsBySectionAndDate(sectionId, date) {
  const res = await fetch(`${API_BASE}/section/${sectionId}/date/${date}`);
  if (!res.ok) throw new Error('Failed to fetch booked seats');
  return await res.json();
}
