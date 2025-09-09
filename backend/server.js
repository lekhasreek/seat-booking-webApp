import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './supabaseClient.js'; // Ensure this path is correct for your supabaseClient.js

dotenv.config();

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.FRONTEND_URL || 'https://seat-booking-webapp.vercel.app',
        /\.vercel\.app$/,
        /\.onrender\.com$/
      ]
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ===============================================
// GET /api/bookings/user/:userId - Return all bookings for a user
// ===============================================
app.get('/api/bookings/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('Bookings')
      .select('*')
      .eq('User_id', userId);
    if (error) {
      return res.status(500).json({ error: error.message, details: error.details });
    }
    res.json({ bookings: data });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});
// GET /api/seats - Return all seats from the 'Seats' table
// ===============================================
app.get('/api/seats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Seats')
      .select('Seat_id, Seat_Number, Status');

    if (error) {
      console.error('Error fetching all seats from Supabase:', error);
      return res.status(500).json({ error: error.message, details: error.details });
    }
    // Return the data wrapped in a 'seats' property as expected by frontend
    res.json({ seats: data });
  } catch (err) {
    console.error('Unexpected error in /api/seats:', err);
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
});

// Add missing closing bracket for the main module scope

// Add missing closing bracket for the file
// This closes the main module scope

// ===============================================
// GET /api/bookings/date/:date/timeslot/:timeslot - Return bookings for a date and timeslot
// ===============================================
app.get('/api/bookings/date/:date/timeslot/:timeslot', async (req, res) => {
  const { date, timeslot } = req.params;
  try {
    const { data, error } = await supabase
      .from('Bookings')
      .select('*')
      .eq('Timeslot', timeslot)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    if (error) {
      console.error('Error fetching bookings by date/timeslot:', error);
      return res.status(500).json({ error: error.message, details: error.details });
    }
    res.json({ bookings: data });
  } catch (err) {
    console.error('Unexpected error fetching bookings by date/timeslot:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// ===============================================
// GET /api/bookings/section/:section/date/:date/timeslot/:timeslot - Return bookings for a section, date, and timeslot
// ===============================================
app.get('/api/bookings/section/:section/date/:date/timeslot/:timeslot', async (req, res) => {
  const { section, date, timeslot } = req.params;
  try {
    const { data, error } = await supabase
      .from('Bookings')
      .select('*')
      .ilike('Seat_Number', `${section}%`)
      .eq('Timeslot', timeslot)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);
    if (error) {
      console.error('Error fetching bookings by section/date/timeslot:', error);
      return res.status(500).json({ error: error.message, details: error.details });
    }
    res.json({ bookings: data });
  } catch (err) {
    console.error('Unexpected error fetching bookings by section/date/timeslot:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// ===============================================
// GET /api/bookings/section/:section/date/:date - Return bookings for a section and date
// ===============================================
app.get('/api/bookings/section/:section/date/:date', async (req, res) => {
  const { section, date } = req.params;
  try {
    const { data, error } = await supabase
      .from('Bookings')
      .select('*')
      .ilike('Seat_Number', `${section}%`)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);
    if (error) {
      console.error('Error fetching bookings by section/date:', error);
      return res.status(500).json({ error: error.message, details: error.details });
    }
    res.json({ bookings: data });
  } catch (err) {
    console.error('Unexpected error fetching bookings by section/date:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// ===============================================
// GET /api/bookings - Return all bookings
// ===============================================
app.get('/api/bookings', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { data, error } = await supabase
      .from('Bookings')
      .select('*');
    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ error: error.message, details: error.details });
    }
    res.json({ bookings: data });
  } catch (err) {
    console.error('Unexpected error fetching bookings:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// ===============================================
// GET /api/users/:userId - Return user record (used to fetch role)
// ===============================================
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('User_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || {});
  } catch (err) {
    console.error('Unexpected error fetching user:', err);
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});


// ===============================================
// POST /api/bookings - Insert a new booking
// ===============================================
app.post('/api/bookings', async (req, res) => 
  {
  let { created_at, Timeslot, User_id } = req.body;
  let seatLabel = req.body.Seat_id;

  // Validate required fields
  if (!created_at || !seatLabel || !Timeslot || !User_id) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields', body: req.body });
  }

  // Handle 'Square-' prefix if it's part of your seat labeling convention
  if (typeof seatLabel === 'string' && seatLabel.startsWith('Square-')) {
    seatLabel = seatLabel.replace('Square-', '');
  }

  // Look up Seat_id and Seat_Number from Seats table using seatLabel (which is Seat_id UUID)
  const { data: seatRows, error: seatError } = await supabase
    .from('Seats')
    .select('Seat_id, Seat_Number')
    .eq('Seat_id', seatLabel)
    .maybeSingle();

  if (seatError || !seatRows || !seatRows.Seat_id) {
    console.error('Seat lookup failed:', seatError, seatRows, 'Searched for Seat_id:', seatLabel);
    return res.status(400).json({ error: 'Invalid Seat_id or seat not found', details: seatError, seatLabel });
  }

  const Seat_id = seatRows.Seat_id;
  const Seat_Number_db = seatRows.Seat_Number;

  // =========================================================================
  // CORE LOGIC: Check for existing booking BEFORE inserting (prevents duplicates)
  // This uses a date range to avoid exact timestamp mismatch issues.
  // Now supports JSON array timeslots and checks for overlap
  // =========================================================================
  const { data: existingBookings, error: existingBookingError } = await supabase
    .from('Bookings')
    .select('Booking_id, Timeslot') // Select ID and Timeslot for conflict check
    .eq('Seat_id', Seat_id)
    .gte('created_at', `${created_at}T00:00:00.000Z`)
    .lte('created_at', `${created_at}T23:59:59.999Z`);

  if (existingBookingError) {
    console.error('Error checking for existing booking:', existingBookingError);
    return res.status(500).json({ error: 'Error checking for existing booking', details: existingBookingError.message });
  }

  // Check for overlapping timeslots and allow insertion of non-conflicting slots
  let requestedTimeslots = [];
  try {
    // Accept both stringified and object Timeslot
    if (typeof Timeslot === 'string') {
      requestedTimeslots = JSON.parse(Timeslot).timeslot;
    } else if (typeof Timeslot === 'object' && Timeslot.timeslot) {
      requestedTimeslots = Timeslot.timeslot;
    } else {
      throw new Error('Invalid timeslot format');
    }
    if (!Array.isArray(requestedTimeslots)) throw new Error('Invalid timeslot format');
  } catch (e) {
    console.error('Invalid Timeslot JSON:', Timeslot, e);
    return res.status(400).json({ error: 'Invalid Timeslot format. Must be JSON: { timeslot: [["09:00", "14:00"]] }' });
  }

  // Build a flat list of existing timeslots for this seat/date
  const existingFlat = [];
  for (const booking of existingBookings) {
    try {
      let ets = [];
      if (typeof booking.Timeslot === 'string') {
        ets = JSON.parse(booking.Timeslot).timeslot || [];
      } else if (typeof booking.Timeslot === 'object' && booking.Timeslot.timeslot) {
        ets = booking.Timeslot.timeslot;
      }
      if (Array.isArray(ets)) {
        ets.forEach(([s, e]) => existingFlat.push([s, e]));
      }
    } catch (err) {
      // ignore malformed
    }
  }

  // Helper to check overlap between two [start,end] strings (HH:MM)
  const overlaps = (a, b) => {
    const [aStart, aEnd] = a;
    const [bStart, bEnd] = b;
    return (aStart < bEnd && aEnd > bStart);
  };

  const nonConflicting = [];
  const conflicts = [];
  for (const req of requestedTimeslots) {
    let hasConflict = false;
    for (const exist of existingFlat) {
      if (overlaps(req, exist)) {
        hasConflict = true;
        break;
      }
    }
    if (hasConflict) conflicts.push(req); else nonConflicting.push(req);
  }

  if (nonConflicting.length === 0) {
    // Nothing to insert
    return res.status(409).json({ error: 'All requested timeslots conflict with existing bookings.', conflicts });
  }
  // =========================================================================

  // Look up User's Name using User_id (for display/record keeping in booking)
  const { data: userRows, error: userError } = await supabase
    .from('Users')
    .select('User_id, Name')
    .eq('User_id', User_id)
    .maybeSingle();

  if (userError || !userRows || !userRows.User_id || !userRows.Name) {
    console.error('User lookup failed:', userError, userRows);
    return res.status(400).json({ error: 'Invalid user ID or user not found', details: userError, User_id });
  }
  const bookedUserName = userRows.Name;

  // Insert one booking row per non-conflicting timeslot
  const inserts = nonConflicting.map(slot => ({
    created_at,
    Seat_id,
    Seat_Number: Seat_Number_db,
    Timeslot: { timeslot: [slot] },
    Name: bookedUserName,
    User_id
  }));

  try {
    const { data: inserted, error: insertError } = await supabase.from('Bookings').insert(inserts);
    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: insertError.message, details: insertError.details, body: req.body });
    }
    // Return inserted records and any conflicts that were skipped
    const response = { inserted };
    if (conflicts.length > 0) response.conflicts = conflicts;
    return res.status(201).json(response);
  } catch (err) {
    console.error('Unexpected insert error:', err);
    return res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }

// ===============================================
// DELETE /api/bookings/:bookingId - Cancel a booking
// ===============================================
app.delete('/api/bookings/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  try {
    const { error } = await supabase
      .from('Bookings')
      .delete()
      .eq('Booking_id', bookingId);
    if (error) {
      console.error('Error deleting booking:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
});

// ===============================================
// PUT /api/bookings/:bookingId - Edit a booking (change seat or timeslot)
// ===============================================
app.put('/api/bookings/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  const updateFields = req.body; // { Seat_id, Timeslot, Date, ... }

  try {
<<<<<<< HEAD
    // If Timeslot is present and is an empty array, delete the booking
    if (
      updateFields.Timeslot &&
      ((typeof updateFields.Timeslot === 'string' && (() => {
        try {
          const parsed = JSON.parse(updateFields.Timeslot);
          return Array.isArray(parsed.timeslot) && parsed.timeslot.length === 0;
        } catch (e) { return false; }
      })()) ||
      (typeof updateFields.Timeslot === 'object' && Array.isArray(updateFields.Timeslot.timeslot) && updateFields.Timeslot.timeslot.length === 0))
    ) {
      // Delete the booking
      const { error } = await supabase
        .from('Bookings')
        .delete()
        .eq('Booking_id', bookingId);
      if (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true, deleted: true });
    }
    // Otherwise, update as normal
=======
    // If Timeslot is being updated, perform overlap check against other bookings for same seat/date
    if (updateFields.Timeslot) {
      // Normalize timeslot into array of [start,end]
      let requestedTimeslots = [];
      try {
        if (typeof updateFields.Timeslot === 'string') {
          requestedTimeslots = JSON.parse(updateFields.Timeslot).timeslot;
        } else if (typeof updateFields.Timeslot === 'object' && updateFields.Timeslot.timeslot) {
          requestedTimeslots = updateFields.Timeslot.timeslot;
        }
        if (!Array.isArray(requestedTimeslots)) requestedTimeslots = [];
      } catch (err) {
        requestedTimeslots = [];
      }

      // Fetch the existing booking to get Seat_id and created_at (date)
      const { data: existingBooking, error: fetchErr } = await supabase
        .from('Bookings')
        .select('Booking_id, Seat_id, created_at, Timeslot')
        .eq('Booking_id', bookingId)
        .maybeSingle();
      if (fetchErr || !existingBooking) {
        console.error('Failed to fetch booking for update check:', fetchErr, existingBooking);
        return res.status(400).json({ error: 'Booking not found for update' });
      }

      const seatId = updateFields.Seat_id || existingBooking.Seat_id;
      const createdAt = updateFields.created_at || existingBooking.created_at;

      // Get other bookings for same seat and date (exclude this bookingId)
      const startOfDay = `${createdAt}T00:00:00.000Z`;
      const endOfDay = `${createdAt}T23:59:59.999Z`;
      const { data: otherBookings, error: otherErr } = await supabase
        .from('Bookings')
        .select('Booking_id, Timeslot')
        .eq('Seat_id', seatId)
        .neq('Booking_id', bookingId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);
      if (otherErr) {
        console.error('Error fetching other bookings for update check:', otherErr);
        return res.status(500).json({ error: otherErr.message });
      }

      // Flatten existing timeslots
      const existingFlat = [];
      for (const b of otherBookings || []) {
        try {
          if (typeof b.Timeslot === 'string') {
            const parsed = JSON.parse(b.Timeslot);
            if (Array.isArray(parsed.timeslot)) parsed.timeslot.forEach(t => existingFlat.push(t));
          } else if (b.Timeslot && Array.isArray(b.Timeslot.timeslot)) {
            b.Timeslot.timeslot.forEach(t => existingFlat.push(t));
          }
        } catch (e) {
          // ignore
        }
      }

      const overlaps = (a, b) => {
        const [aStart, aEnd] = a;
        const [bStart, bEnd] = b;
        return (aStart < bEnd && aEnd > bStart);
      };

      for (const req of requestedTimeslots) {
        for (const exist of existingFlat) {
          if (overlaps(req, exist)) {
            return res.status(409).json({ error: 'Requested timeslot overlaps with another booking.' });
          }
        }
      }
    }

>>>>>>> c8550b9e7b14b886c71f99da6d34eae1ddd7d69f
    const { error } = await supabase
      .from('Bookings')
      .update(updateFields)
      .eq('Booking_id', bookingId);
    if (error) {
      console.error('Error updating booking:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
}
              );});
  

// Start the server after all route handlers
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
  