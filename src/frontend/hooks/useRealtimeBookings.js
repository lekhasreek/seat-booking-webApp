import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '../contexts/RealtimeContext';

/**
 * Hook for managing realtime booking subscriptions for a specific section and date
 * @param {string} sectionId - The section ID (A, B, C, etc.)
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoSubscribe - Whether to automatically subscribe on mount (default: true)
 * @param {Function} options.onBookingChange - Callback fired when bookings change
 * @returns {Object} - Booking data and control methods
 */
export const useRealtimeBookings = (sectionId, date, options = {}) => {
  const {
    subscribeToBookings,
    unsubscribeFromBookings,
    bookingsBySection,
    refreshBookings,
    connectionStatus
  } = useRealtime();

  const { autoSubscribe = true, onBookingChange } = options;

  const [subscriptionKey, setSubscriptionKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get bookings for the current section and date
  const bookings = bookingsBySection[sectionId]?.[date] || {};

  // Subscribe to realtime updates
  const subscribe = useCallback(async () => {
    if (!sectionId || !date) return null;

    setIsLoading(true);
    setError(null);

    try {
      const key = await subscribeToBookings(sectionId, date, (changeData) => {
        console.log('Booking change in hook:', changeData);
        
        // Call the optional callback
        if (onBookingChange) {
          onBookingChange(changeData);
        }
      });

      if (key) {
        setSubscriptionKey(key);
        console.log(`Successfully subscribed to ${sectionId} bookings for ${date}`);
      } else {
        setError('Failed to create subscription');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }

    return subscriptionKey;
  }, [sectionId, date, subscribeToBookings, onBookingChange]);

  // Unsubscribe from realtime updates
  const unsubscribe = useCallback(() => {
    if (subscriptionKey) {
      unsubscribeFromBookings(subscriptionKey);
      setSubscriptionKey(null);
      console.log(`Unsubscribed from ${sectionId} bookings for ${date}`);
    }
  }, [subscriptionKey, unsubscribeFromBookings, sectionId, date]);

  // Refresh bookings manually
  const refresh = useCallback(async () => {
    if (!sectionId || !date) return;

    setIsLoading(true);
    setError(null);

    try {
      await refreshBookings(sectionId, date);
    } catch (err) {
      console.error('Refresh error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId, date, refreshBookings]);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (autoSubscribe && sectionId && date) {
      subscribe();
    }

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionKey) {
        unsubscribeFromBookings(subscriptionKey);
      }
    };
  }, [sectionId, date, autoSubscribe]); // Note: not including subscribe to avoid re-subscription loops

  // Re-subscribe when section or date changes
  useEffect(() => {
    if (subscriptionKey && (sectionId || date)) {
      // Unsubscribe from previous
      unsubscribe();
      
      // Subscribe to new section/date if autoSubscribe is enabled
      if (autoSubscribe) {
        subscribe();
      }
    }
  }, [sectionId, date]); // Note: not including subscribe/unsubscribe to avoid loops

  // Utility functions for working with booking data
  const getBookingForSeat = useCallback((seatNumber, timeslot) => {
    return bookings[seatNumber]?.[timeslot] || null;
  }, [bookings]);

  const getSeatBookings = useCallback((seatNumber) => {
    return bookings[seatNumber] || {};
  }, [bookings]);

  const isBookedSeat = useCallback((seatNumber, timeslot = null) => {
    if (timeslot) {
      return !!bookings[seatNumber]?.[timeslot];
    }
    // Check if seat has any bookings for any timeslot
    return Object.keys(bookings[seatNumber] || {}).length > 0;
  }, [bookings]);

  const getAvailableSeats = useCallback((timeslot = null) => {
    // This would need the total seats list to compare against
    // For now, return seats that are NOT in the bookings
    const bookedSeats = Object.keys(bookings);
    
    if (timeslot) {
      return bookedSeats.filter(seatNumber => !bookings[seatNumber][timeslot]);
    }
    
    return bookedSeats.filter(seatNumber => Object.keys(bookings[seatNumber]).length === 0);
  }, [bookings]);

  const getBookingStats = useCallback(() => {
    const stats = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      total: 0
    };

    Object.values(bookings).forEach(seatBookings => {
      Object.keys(seatBookings).forEach(timeslot => {
        if (stats[timeslot] !== undefined) {
          stats[timeslot]++;
          stats.total++;
        }
      });
    });

    return stats;
  }, [bookings]);

  return {
    // Data
    bookings,
    connectionStatus,
    isLoading,
    error,
    subscriptionKey,

    // Control methods
    subscribe,
    unsubscribe,
    refresh,

    // Utility methods
    getBookingForSeat,
    getSeatBookings,
    isBookedSeat,
    getAvailableSeats,
    getBookingStats,

    // Status
    isSubscribed: !!subscriptionKey,
    isConnected: connectionStatus === 'connected',
  };
};
