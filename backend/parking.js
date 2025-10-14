// Parking booking API endpoints with time-based availability
import { supabase } from './supabaseClient.js';

/**
 * GET /api/parking/availability
 * Returns parking slots with availability status for a given time range
 * Query params: from (ISO timestamp), to (ISO timestamp), vehicleType (optional: 'two' or 'four')
 */
export const getAvailability = async (req, res) => {
  const { from, to, vehicleType } = req.query;

  // Validate required parameters
  if (!from || !to) {
    return res.status(400).json({ 
      error: 'Missing required parameters', 
      message: 'Both "from" and "to" query parameters are required (ISO 8601 format)' 
    });
  }

  // Validate time range
  const startTime = new Date(from);
  const endTime = new Date(to);
  
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 format.' });
  }

  if (endTime <= startTime) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  try {
    // Get all parking slots, optionally filtered by vehicle type
    let slotsQuery = supabase
      .from('parking_slots')
      .select('id, vehicle_type')
      .order('id');

    if (vehicleType && (vehicleType === 'two' || vehicleType === 'four')) {
      slotsQuery = slotsQuery.eq('vehicle_type', vehicleType);
    }

    const { data: slots, error: slotsError } = await slotsQuery;

    if (slotsError) throw slotsError;

    // For each slot, check if there are any overlapping bookings
    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        // Check for overlapping bookings using timestamp overlap logic
        const { data: overlappingBookings, error: bookingsError } = await supabase
          .from('parking_bookings')
          .select('id, start_time, end_time, vehicle_number, booked_by_user_id')
          .eq('slot_id', slot.id)
          .or(`and(start_time.lt.${to},end_time.gt.${from})`);

        if (bookingsError) {
          console.error(`Error checking bookings for slot ${slot.id}:`, bookingsError);
          return { ...slot, is_available: false, bookings: [] };
        }

        const is_available = !overlappingBookings || overlappingBookings.length === 0;
        
        return {
          ...slot,
          is_available,
          bookings: overlappingBookings || [],
          booking_count: overlappingBookings ? overlappingBookings.length : 0
        };
      })
    );

    res.json({ 
      slots: slotsWithAvailability,
      time_range: { from, to },
      total_slots: slotsWithAvailability.length,
      available_slots: slotsWithAvailability.filter(s => s.is_available).length,
      booked_slots: slotsWithAvailability.filter(s => !s.is_available).length
    });

  } catch (error) {
    console.error('Error fetching parking availability:', error);
    res.status(500).json({ 
      error: 'Error fetching parking availability', 
      details: error.message 
    });
  }
};

/**
 * POST /api/parking/book
 * Create a new parking booking with time range validation
 * Body: { slot_id, start_time, end_time, vehicle_number, user_id }
 */
export const createBooking = async (req, res) => {
  const { slot_id, start_time, end_time, vehicle_number, user_id } = req.body;

  // Validate required fields
  if (!slot_id || !start_time || !end_time || !vehicle_number || !user_id) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['slot_id', 'start_time', 'end_time', 'vehicle_number', 'user_id']
    });
  }

  // Validate time range
  const startDateTime = new Date(start_time);
  const endDateTime = new Date(end_time);

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return res.status(400).json({ error: 'Invalid date format. Use ISO 8601 format.' });
  }

  if (endDateTime <= startDateTime) {
    return res.status(400).json({ error: 'End time must be after start time' });
  }

  try {
    // Check if slot exists
    const { data: slotData, error: slotError } = await supabase
      .from('parking_slots')
      .select('id, vehicle_type')
      .eq('id', slot_id)
      .single();

    if (slotError || !slotData) {
      return res.status(404).json({ error: 'Parking slot not found' });
    }

    // Check for overlapping bookings
    const { data: overlappingBookings, error: overlapError } = await supabase
      .from('parking_bookings')
      .select('id, start_time, end_time')
      .eq('slot_id', slot_id)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

    if (overlapError) throw overlapError;

    if (overlappingBookings && overlappingBookings.length > 0) {
      return res.status(409).json({ 
        error: 'Slot is already booked for the selected time range',
        conflicts: overlappingBookings.map(b => ({
          start: b.start_time,
          end: b.end_time
        }))
      });
    }

    // Create the booking
    const { data: newBooking, error: insertError } = await supabase
      .from('parking_bookings')
      .insert([{
        slot_id,
        start_time,
        end_time,
        vehicle_number,
        booked_by_user_id: user_id
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ 
      success: true,
      booking: newBooking,
      message: `Slot ${slot_id} booked successfully`
    });

  } catch (error) {
    console.error('Error creating parking booking:', error);
    res.status(500).json({ 
      error: 'Error creating parking booking', 
      details: error.message 
    });
  }
};

/**
 * GET /api/parking/bookings/user/:userId
 * Get all parking bookings for a specific user
 */
export const getUserBookings = async (req, res) => {
  const { userId } = req.params;
  const { active } = req.query; // Optional: filter for active bookings only

  try {
    let query = supabase
      .from('parking_bookings')
      .select('*, parking_slots(id, vehicle_type)')
      .eq('booked_by_user_id', userId)
      .order('start_time', { ascending: false });

    // If active flag is true, only return bookings that haven't ended yet
    if (active === 'true') {
      const now = new Date().toISOString();
      query = query.gte('end_time', now);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    res.json({ 
      bookings: bookings || [],
      count: bookings ? bookings.length : 0
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      error: 'Error fetching user bookings', 
      details: error.message 
    });
  }
};

/**
 * GET /api/parking/bookings/:bookingId
 * Get a specific booking by ID
 */
export const getBookingById = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const { data: booking, error } = await supabase
      .from('parking_bookings')
      .select('*, parking_slots(id, vehicle_type)')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ 
      error: 'Error fetching booking', 
      details: error.message 
    });
  }
};

/**
 * DELETE /api/parking/bookings/:bookingId
 * Cancel a parking booking
 */
export const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const { userId } = req.body; // User ID for authorization check

  try {
    // Verify booking exists and belongs to the user
    const { data: booking, error: fetchError } = await supabase
      .from('parking_bookings')
      .select('id, booked_by_user_id, slot_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Authorization check (optional - can be enforced via RLS)
    if (userId && booking.booked_by_user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    // Delete the booking
    const { error: deleteError } = await supabase
      .from('parking_bookings')
      .delete()
      .eq('id', bookingId);

    if (deleteError) throw deleteError;

    res.json({ 
      success: true,
      message: `Booking for slot ${booking.slot_id} cancelled successfully`
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      error: 'Error cancelling booking', 
      details: error.message 
    });
  }
};

/**
 * GET /api/parking/slots/:slotId/bookings
 * Get all bookings for a specific parking slot
 */
export const getSlotBookings = async (req, res) => {
  const { slotId } = req.params;
  const { from, to } = req.query; // Optional time range filter

  try {
    let query = supabase
      .from('parking_bookings')
      .select('*')
      .eq('slot_id', slotId)
      .order('start_time', { ascending: true });

    // Filter by time range if provided
    if (from && to) {
      query = query.or(`and(start_time.lt.${to},end_time.gt.${from})`);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    res.json({ 
      slot_id: slotId,
      bookings: bookings || [],
      count: bookings ? bookings.length : 0
    });

  } catch (error) {
    console.error('Error fetching slot bookings:', error);
    res.status(500).json({ 
      error: 'Error fetching slot bookings', 
      details: error.message 
    });
  }
};

export default {
  getAvailability,
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getSlotBookings
};
