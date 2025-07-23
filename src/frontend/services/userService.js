// Frontend API calls for users
import { API_ENDPOINTS } from './config/api.js';

export async function upsertUser({ id, email, name }) {
  const res = await fetch(`${API_ENDPOINTS.USERS || API_ENDPOINTS.BOOKINGS.replace('/bookings', '/users')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      User_id: id,
      email,
      Name: name
    }),
  });
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.error || 'Failed to upsert user');
  }
  return await res.json();
}
