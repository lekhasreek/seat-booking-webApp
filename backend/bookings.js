// Backend logic for Bookings table 
// All functions now call the backend Express API instead of Supabase directly
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000') + '/api/bookings';

export async function insertBooking(booking) {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!res.ok) {
    // IMPORTANT CHANGE: Parse the error response to get the specific message
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to insert booking'); // Use backend's 'error' field
  }
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

// Cancel a booking by ID
export async function deleteBooking(bookingId) {
  const res = await fetch(`${API_BASE}/${bookingId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to delete booking');
  }
  return await res.json();
}

// Edit a booking by ID
export async function editBooking(bookingId, updateFields) {
  const res = await fetch(`${API_BASE}/${bookingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateFields),
  });
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to edit booking');
  }
  return await res.json();
}