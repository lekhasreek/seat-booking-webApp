// Frontend API calls for bookings
import { API_ENDPOINTS } from './config/api.js';

export async function insertBooking(booking) {
  const res = await fetch(API_ENDPOINTS.BOOKINGS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to insert booking');
  }
  return await res.json();
}

export async function getBookingsByUser(userId) {
  const res = await fetch(`${API_ENDPOINTS.BOOKINGS}/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch bookings by user');
  return await res.json();
}

export async function getBookedSeatsBySectionAndDate(sectionId, date) {
  const res = await fetch(`${API_ENDPOINTS.BOOKINGS}/section/${sectionId}/date/${date}`);
  if (!res.ok) throw new Error('Failed to fetch booked seats');
  return await res.json();
}
