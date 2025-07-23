// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  SEATS: `${API_BASE_URL}/api/seats`,
  BOOKINGS: `${API_BASE_URL}/api/bookings`,
  USERS: `${API_BASE_URL}/api/users`,
  // Add other endpoints as needed
};

export default API_BASE_URL;
