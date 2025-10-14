/**
 * Parking Booking Utilities
 * Helper functions for time-based parking slot management
 */

/**
 * Check if two time ranges overlap
 * @param {Date|string} start1 - Start time of first range
 * @param {Date|string} end1 - End time of first range
 * @param {Date|string} start2 - Start time of second range
 * @param {Date|string} end2 - End time of second range
 * @returns {boolean} - True if ranges overlap
 */
export const checkTimeRangeOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  // Ranges overlap if: start1 < end2 AND end1 > start2
  return s1 < e2 && e1 > s2;
};

/**
 * Format a date to a readable string
 * @param {Date|string} date - The date to format
 * @param {object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return 'Not set';
  
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return new Date(date).toLocaleString('en-US', defaultOptions);
};

/**
 * Format a date for datetime-local input
 * @param {Date} date - The date to format
 * @returns {string} - Formatted string (YYYY-MM-DDTHH:mm)
 */
export const formatDateTimeLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get default start and end times (next hour + 2 hours)
 * @returns {object} - Object with startTime and endTime
 */
export const getDefaultTimeRange = () => {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  
  const twoHoursLater = new Date(nextHour);
  twoHoursLater.setHours(nextHour.getHours() + 2);

  return {
    startTime: formatDateTimeLocal(nextHour),
    endTime: formatDateTimeLocal(twoHoursLater)
  };
};

/**
 * Validate a time range
 * @param {string} startTime - Start time (ISO string or datetime-local format)
 * @param {string} endTime - End time (ISO string or datetime-local format)
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return { valid: false, error: 'Both start and end times are required' };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (end <= start) {
    return { valid: false, error: 'End time must be after start time' };
  }

  const now = new Date();
  if (start < now) {
    return { valid: false, error: 'Start time cannot be in the past' };
  }

  return { valid: true };
};

/**
 * Calculate duration between two times
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time
 * @returns {object} - Duration in hours and minutes
 */
export const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
};

/**
 * Format duration as a readable string
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time
 * @returns {string} - Formatted duration (e.g., "2 hours 30 minutes")
 */
export const formatDuration = (startTime, endTime) => {
  const { hours, minutes } = calculateDuration(startTime, endTime);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.join(' ') || '0 minutes';
};

/**
 * Check if a booking is currently active
 * @param {object} booking - Booking object with start_time and end_time
 * @returns {boolean} - True if currently active
 */
export const isBookingActive = (booking) => {
  const now = new Date();
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  
  return now >= start && now <= end;
};

/**
 * Check if a booking is in the future
 * @param {object} booking - Booking object with start_time
 * @returns {boolean} - True if in the future
 */
export const isBookingFuture = (booking) => {
  const now = new Date();
  const start = new Date(booking.start_time);
  
  return start > now;
};

/**
 * Check if a booking has ended
 * @param {object} booking - Booking object with end_time
 * @returns {boolean} - True if ended
 */
export const isBookingEnded = (booking) => {
  const now = new Date();
  const end = new Date(booking.end_time);
  
  return end < now;
};

/**
 * Get booking status
 * @param {object} booking - Booking object
 * @returns {string} - 'active', 'upcoming', or 'ended'
 */
export const getBookingStatus = (booking) => {
  if (isBookingActive(booking)) return 'active';
  if (isBookingFuture(booking)) return 'upcoming';
  return 'ended';
};

/**
 * Sort bookings by start time
 * @param {Array} bookings - Array of booking objects
 * @param {boolean} ascending - Sort order (default: true)
 * @returns {Array} - Sorted bookings
 */
export const sortBookingsByTime = (bookings, ascending = true) => {
  return [...bookings].sort((a, b) => {
    const timeA = new Date(a.start_time).getTime();
    const timeB = new Date(b.start_time).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
};

/**
 * Group bookings by date
 * @param {Array} bookings - Array of booking objects
 * @returns {object} - Bookings grouped by date
 */
export const groupBookingsByDate = (bookings) => {
  const grouped = {};
  
  bookings.forEach(booking => {
    const date = new Date(booking.start_time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(booking);
  });
  
  return grouped;
};

/**
 * Filter bookings by time range
 * @param {Array} bookings - Array of booking objects
 * @param {Date|string} fromTime - Start of range
 * @param {Date|string} toTime - End of range
 * @returns {Array} - Filtered bookings that overlap with the range
 */
export const filterBookingsByTimeRange = (bookings, fromTime, toTime) => {
  return bookings.filter(booking => 
    checkTimeRangeOverlap(booking.start_time, booking.end_time, fromTime, toTime)
  );
};

/**
 * Validate vehicle number format
 * @param {string} vehicleNumber - Vehicle registration number
 * @returns {boolean} - True if valid format
 */
export const validateVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber || typeof vehicleNumber !== 'string') return false;
  
  // Remove spaces and convert to uppercase
  const cleaned = vehicleNumber.replace(/\s+/g, '').toUpperCase();
  
  // Basic validation: should be at least 4 characters and contain letters and numbers
  const hasLetters = /[A-Z]/.test(cleaned);
  const hasNumbers = /[0-9]/.test(cleaned);
  const minLength = cleaned.length >= 4;
  
  return hasLetters && hasNumbers && minLength;
};

/**
 * Format vehicle number for display
 * @param {string} vehicleNumber - Vehicle registration number
 * @returns {string} - Formatted vehicle number
 */
export const formatVehicleNumber = (vehicleNumber) => {
  if (!vehicleNumber) return '';
  return vehicleNumber.toUpperCase().trim();
};

/**
 * Generate time slots for a day (e.g., for a dropdown)
 * @param {number} intervalMinutes - Interval between slots (default: 30)
 * @returns {Array} - Array of time slots
 */
export const generateTimeSlots = (intervalMinutes = 30) => {
  const slots = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24 * 60; i += intervalMinutes) {
    const hours = Math.floor(i / 60);
    const minutes = i % 60;
    
    const time = new Date(date);
    time.setHours(hours, minutes);
    
    slots.push({
      value: formatDateTimeLocal(time),
      label: time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    });
  }
  
  return slots;
};

export default {
  checkTimeRangeOverlap,
  formatDateTime,
  formatDateTimeLocal,
  getDefaultTimeRange,
  validateTimeRange,
  calculateDuration,
  formatDuration,
  isBookingActive,
  isBookingFuture,
  isBookingEnded,
  getBookingStatus,
  sortBookingsByTime,
  groupBookingsByDate,
  filterBookingsByTimeRange,
  validateVehicleNumber,
  formatVehicleNumber,
  generateTimeSlots
};
