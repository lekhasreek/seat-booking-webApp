import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const RealtimeContext = createContext({
  // Connection status
  connectionStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected' | 'error'
  
  // Booking subscriptions management
  subscriptions: {},
  
  // Global booking state for different sections/dates
  bookingsBySection: {}, // { sectionId: { date: { seatNumber: { timeslot: bookingObject } } } }
  
  // Subscription methods
  subscribeToBookings: () => {},
  unsubscribeFromBookings: () => {},
  
  // Manual refresh method
  refreshBookings: () => {},
});

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export const RealtimeProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [subscriptions, setSubscriptions] = useState({});
  const [bookingsBySection, setBookingsBySection] = useState({});
  
  // Keep track of active channels to prevent duplicates
  const activeChannels = useRef(new Map());
  
  // Connection status monitoring
  useEffect(() => {
    // Set initial status to connecting
    setConnectionStatus('connecting');
    
    // Check connection after a brief delay
    const timer = setTimeout(() => {
      // Simple connection test - just check if supabase client is available
      try {
        if (supabase && supabase.channel) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus('error');
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Cleanup: disconnect all channels on unmount
      if (supabase.realtime && supabase.realtime.disconnect) {
        supabase.realtime.disconnect();
      }
    };
  }, []);

  // Subscribe to booking changes for a specific section and date
  const subscribeToBookings = async (sectionId, date, callback) => {
    const subscriptionKey = `${sectionId}-${date}`;
    
    // Don't create duplicate subscriptions
    if (activeChannels.current.has(subscriptionKey)) {
      return subscriptionKey;
    }

    try {
      // Create a channel for this section/date combination
      const channel = supabase
        .channel(`bookings-${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'Bookings',
          },
          async (payload) => {
            // Handle the realtime update immediately
            try {
              await handleBookingChange(payload, sectionId, date, callback);
            } catch (error) {
              console.error('Error in handleBookingChange:', error);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('Subscription error:', err);
          }
          
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error for', subscriptionKey, ':', err);
            setConnectionStatus('error');
          } else if (status === 'TIMED_OUT') {
            console.warn('Subscription timed out for', subscriptionKey);
            setConnectionStatus('disconnected');
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });

      // Store the channel reference
      activeChannels.current.set(subscriptionKey, channel);
      
      // Update subscriptions state
      setSubscriptions(prev => ({
        ...prev,
        [subscriptionKey]: {
          sectionId,
          date,
          channel,
          callback,
          createdAt: new Date().toISOString()
        }
      }));

      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to bookings:', error);
      setConnectionStatus('error');
      
      // If real-time fails, the app will fallback to periodic refresh
      console.warn('Real-time subscription failed, falling back to periodic refresh');
      return null;
    }
  };

  // Handle booking changes and update local state
  const handleBookingChange = async (payload, sectionId, date, callback) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      // First, check if this booking belongs to the date we're monitoring
      const bookingRecord = newRecord || oldRecord;
      if (!bookingRecord) {
        return;
      }

      // Check if the booking's created_at falls within the target date
      const bookingDate = new Date(bookingRecord.created_at);
      const targetDate = new Date(date);
      
      // Compare dates (ignore time)
      const bookingDateStr = bookingDate.toISOString().split('T')[0];
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      if (bookingDateStr !== targetDateStr) {
        return;
      }

      // For INSERT/UPDATE, we need to get the seat number from the seat ID
      let seatNumber = null;
      if (newRecord?.Seat_id) {
        // Fetch seat details to get seat number
        const { data: seatData, error } = await supabase
          .from('Seats')
          .select('Seat_Number')
          .eq('Seat_id', newRecord.Seat_id)
          .single();
        
        if (!error && seatData) {
          seatNumber = seatData.Seat_Number;
        } else {
          console.error('❌ Failed to get seat number for new record:', error);
        }
      }

      // For DELETE, try to get seat number from old record or existing state
      if (eventType === 'DELETE' && oldRecord?.Seat_id) {
        const { data: seatData, error } = await supabase
          .from('Seats')
          .select('Seat_Number')
          .eq('Seat_id', oldRecord.Seat_id)
          .single();
        
        if (!error && seatData) {
          seatNumber = seatData.Seat_Number;
        } else {
          console.error('❌ Failed to get seat number for deleted record:', error);
        }
      }

      // Only process if we have the seat number and it belongs to the current section
      if (seatNumber && seatNumber.startsWith(sectionId)) {
        
        setBookingsBySection(prev => {
          const updated = { ...prev };
          
          // Ensure section and date exist
          if (!updated[sectionId]) updated[sectionId] = {};
          if (!updated[sectionId][date]) updated[sectionId][date] = {};
          if (!updated[sectionId][date][seatNumber]) updated[sectionId][date][seatNumber] = {};

          switch (eventType) {
            case 'INSERT':
            case 'UPDATE':
              // Add or update the booking
              updated[sectionId][date][seatNumber][newRecord.Timeslot] = {
                ...newRecord,
                Seat_Number: seatNumber
              };
              break;
            
            case 'DELETE':
              // Remove the booking
              if (oldRecord?.Timeslot) {
                delete updated[sectionId][date][seatNumber][oldRecord.Timeslot];
                
                // Clean up empty objects
                if (Object.keys(updated[sectionId][date][seatNumber]).length === 0) {
                  delete updated[sectionId][date][seatNumber];
                }
              }
              break;
          }

          return updated;
        });

        // Call the callback with the processed data
        if (callback) {
          callback({
            eventType,
            seatNumber,
            booking: eventType === 'DELETE' ? oldRecord : newRecord,
            sectionId,
            date
          });
        }

        // Show user-friendly notifications
        if (eventType === 'INSERT') {
          toast.info(`Seat ${seatNumber} booked for ${newRecord.Timeslot}`, {
            position: 'bottom-right',
            autoClose: 3000,
          });
        } else if (eventType === 'DELETE') {
          toast.info(`Seat ${seatNumber} is now available`, {
            position: 'bottom-right',
            autoClose: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error handling booking change:', error);
    }
  };

  // Unsubscribe from booking changes
  const unsubscribeFromBookings = (subscriptionKey) => {
    const subscription = subscriptions[subscriptionKey];
    if (subscription && activeChannels.current.has(subscriptionKey)) {
      // Remove the channel
      const channel = activeChannels.current.get(subscriptionKey);
      supabase.removeChannel(channel);
      activeChannels.current.delete(subscriptionKey);
      
      // Update subscriptions state
      setSubscriptions(prev => {
        const updated = { ...prev };
        delete updated[subscriptionKey];
        return updated;
      });
    }
  };

  // Manual refresh method for fallback
  const refreshBookings = async (sectionId, date) => {
    try {
      // This could call your existing API or directly query Supabase
      // For now, we'll use the existing backend API pattern
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bookings/section/${sectionId}/date/${date}`);
      const { bookings } = await response.json();
      
      // Process and update local state
      const processedBookings = {};
      for (const booking of bookings) {
        if (!processedBookings[booking.Seat_Number]) {
          processedBookings[booking.Seat_Number] = {};
        }
        processedBookings[booking.Seat_Number][booking.Timeslot] = booking;
      }
      
      setBookingsBySection(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [date]: processedBookings
        }
      }));
      
    } catch (error) {
      console.error('Failed to refresh bookings:', error);
      toast.error('Failed to refresh booking data');
    }
  };

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      activeChannels.current.forEach((channel, key) => {
        supabase.removeChannel(channel);
      });
      activeChannels.current.clear();
    };
  }, []);

  const value = {
    connectionStatus,
    subscriptions,
    bookingsBySection,
    subscribeToBookings,
    unsubscribeFromBookings,
    refreshBookings,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeContext;
