import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRealtimeBookings } from './useRealtimeBookings';

// Total seats per section (matches the existing TOTAL_SEATS constant)
const TOTAL_SEATS = {
  A: 16, B: 13, C: 9, D: 10, E: 8, F: 8, G: 10
};

/**
 * Hook for getting real-time seat availability status for sections
 * @param {string|Array} sections - Single section ID or array of section IDs
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {Object} options - Configuration options
 * @returns {Object} - Seat availability data and methods
 */
export const useRealtimeSeatStatus = (sections, date, options = {}) => {
  const sectionArray = Array.isArray(sections) ? sections : [sections];
  const [sectionStatuses, setSectionStatuses] = useState({});

  // Create a realtime booking subscription for each section
  const bookingHooks = sectionArray.reduce((acc, sectionId) => {
    if (sectionId) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      acc[sectionId] = useRealtimeBookings(sectionId, date, {
        autoSubscribe: true,
        onBookingChange: (changeData) => {
          console.log(`Seat status change in section ${sectionId}:`, changeData);
          
          // Update section status when bookings change
          updateSectionStatus(sectionId);
        }
      });
    }
    return acc;
  }, {});

  // Calculate availability for a specific section and timeslot
  const calculateAvailability = useCallback((sectionId, timeslot) => {
    const bookingHook = bookingHooks[sectionId];
    if (!bookingHook) return { available: 0, total: 0, percentage: 0 };

    const totalSeats = TOTAL_SEATS[sectionId] || 0;
    const bookingStats = bookingHook.getBookingStats();
    const bookedCount = bookingStats[timeslot] || 0;
    const available = Math.max(0, totalSeats - bookedCount);
    const percentage = totalSeats > 0 ? Math.round((available / totalSeats) * 100) : 0;

    return {
      available,
      total: totalSeats,
      booked: bookedCount,
      percentage
    };
  }, [bookingHooks]);

  // Calculate all timeslots for a section
  const calculateSectionStatus = useCallback((sectionId) => {
    return {
      morning: calculateAvailability(sectionId, 'morning'),
      afternoon: calculateAvailability(sectionId, 'afternoon'),
      evening: calculateAvailability(sectionId, 'evening'),
      sectionId,
      date,
      lastUpdated: new Date().toISOString()
    };
  }, [calculateAvailability, date]);

  // Update status for a specific section
  const updateSectionStatus = useCallback((sectionId) => {
    const newStatus = calculateSectionStatus(sectionId);
    setSectionStatuses(prev => ({
      ...prev,
      [sectionId]: newStatus
    }));
  }, [calculateSectionStatus]);

  // Update all section statuses
  const updateAllStatuses = useCallback(() => {
    const newStatuses = {};
    sectionArray.forEach(sectionId => {
      if (sectionId) {
        newStatuses[sectionId] = calculateSectionStatus(sectionId);
      }
    });
    setSectionStatuses(newStatuses);
  }, [sectionArray, calculateSectionStatus]);

  // Update statuses when booking data changes
  useEffect(() => {
    updateAllStatuses();
  }, [updateAllStatuses]);

  // Memoized status data for performance
  const statusData = useMemo(() => {
    return {
      bySection: sectionStatuses,
      
      // Overall statistics across all sections
      overall: {
        totalSections: sectionArray.length,
        connectedSections: Object.values(bookingHooks).filter(hook => hook.isConnected).length,
        totalSeats: sectionArray.reduce((sum, sectionId) => sum + (TOTAL_SEATS[sectionId] || 0), 0),
        totalAvailable: {
          morning: Object.values(sectionStatuses).reduce((sum, status) => sum + status.morning.available, 0),
          afternoon: Object.values(sectionStatuses).reduce((sum, status) => sum + status.afternoon.available, 0),
          evening: Object.values(sectionStatuses).reduce((sum, status) => sum + status.evening.available, 0),
        }
      }
    };
  }, [sectionStatuses, sectionArray, bookingHooks]);

  // Get status for a specific section
  const getSectionStatus = useCallback((sectionId) => {
    return sectionStatuses[sectionId] || null;
  }, [sectionStatuses]);

  // Get availability for a specific section and timeslot
  const getAvailability = useCallback((sectionId, timeslot) => {
    const sectionStatus = sectionStatuses[sectionId];
    return sectionStatus?.[timeslot] || { available: 0, total: 0, percentage: 0 };
  }, [sectionStatuses]);

  // Check if a section has available seats for a timeslot
  const hasAvailableSeats = useCallback((sectionId, timeslot) => {
    const availability = getAvailability(sectionId, timeslot);
    return availability.available > 0;
  }, [getAvailability]);

  // Get the least busy timeslot for a section
  const getLeastBusyTimeslot = useCallback((sectionId) => {
    const sectionStatus = sectionStatuses[sectionId];
    if (!sectionStatus) return null;

    const timeslots = ['morning', 'afternoon', 'evening'];
    let leastBusy = timeslots[0];
    let maxAvailable = sectionStatus[leastBusy].available;

    timeslots.forEach(timeslot => {
      if (sectionStatus[timeslot].available > maxAvailable) {
        maxAvailable = sectionStatus[timeslot].available;
        leastBusy = timeslot;
      }
    });

    return {
      timeslot: leastBusy,
      available: maxAvailable,
      percentage: sectionStatus[leastBusy].percentage
    };
  }, [sectionStatuses]);

  // Refresh all section data
  const refreshAll = useCallback(async () => {
    const refreshPromises = Object.values(bookingHooks).map(hook => hook.refresh());
    await Promise.all(refreshPromises);
    updateAllStatuses();
  }, [bookingHooks, updateAllStatuses]);

  // Connection status across all sections
  const connectionStatus = useMemo(() => {
    const hooks = Object.values(bookingHooks);
    if (hooks.length === 0) return 'disconnected';
    
    const connectedCount = hooks.filter(hook => hook.isConnected).length;
    
    if (connectedCount === hooks.length) return 'connected';
    if (connectedCount > 0) return 'partial';
    return 'disconnected';
  }, [bookingHooks]);

  return {
    // Main data
    statusData,
    connectionStatus,
    isLoading: Object.values(bookingHooks).some(hook => hook.isLoading),
    error: Object.values(bookingHooks).find(hook => hook.error)?.error || null,

    // Utility methods
    getSectionStatus,
    getAvailability,
    hasAvailableSeats,
    getLeastBusyTimeslot,
    updateSectionStatus,
    updateAllStatuses,
    refreshAll,

    // Raw booking hooks for advanced usage
    bookingHooks,
  };
};
