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

    console.log(`Fetched bookings for date ${date}, timeslot ${timeslot}:`, data, 'Error:', error);
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
    console.log(`Fetched bookings for section ${section}, date ${date}, timeslot ${timeslot}:`, data, 'Error:', error);
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
    console.log(`Fetched bookings for section ${section} and date ${date}:`, data, 'Error:', error);
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
    console.log('Fetched bookings:', data, 'Error:', error);
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

  // Check for overlapping timeslots
  let conflict = false;
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

  for (const booking of existingBookings) {
    let existingTimeslots = [];
    try {
      if (typeof booking.Timeslot === 'string') {
        existingTimeslots = JSON.parse(booking.Timeslot).timeslot;
      } else if (typeof booking.Timeslot === 'object' && booking.Timeslot.timeslot) {
        existingTimeslots = booking.Timeslot.timeslot;
      }
      if (!Array.isArray(existingTimeslots)) continue;
    } catch (e) {
      continue;
    }
    // Check for any overlap
    for (const [reqStart, reqEnd] of requestedTimeslots) {
      for (const [existStart, existEnd] of existingTimeslots) {
        if (
          (reqStart < existEnd && reqEnd > existStart) // Overlap condition
        ) {
          conflict = true;
          break;
        }
      }
      if (conflict) break;
    }
    if (conflict) break;
  }

  if (conflict) {
    return res.status(409).json({ error: 'This seat is already booked for one or more of the selected timeslots.' });
  }
  // =========================================================================

  // Look up User's Name using User_id (for display/record keeping in booking)
  console.log('Looking up user with User_id:', User_id);
  const { data: userRows, error: userError } = await supabase
    .from('Users')
    .select('User_id, Name')
    .eq('User_id', User_id)
    .maybeSingle();

  console.log('User lookup result:', userRows, 'Error:', userError);
  if (userError || !userRows || !userRows.User_id || !userRows.Name) {
    console.error('User lookup failed:', userError, userRows);
    return res.status(400).json({ error: 'Invalid user ID or user not found', details: userError, User_id });
  }
  const bookedUserName = userRows.Name;

  // Insert the new booking into the 'Bookings' table
  // For Supabase json column, store as native object
  let timeslotToStore;
  if (typeof Timeslot === 'string') {
    try {
      timeslotToStore = JSON.parse(Timeslot);
    } catch (e) {
      timeslotToStore = Timeslot;
    }
  } else {
    timeslotToStore = Timeslot;
  }

  const { data, error } = await supabase.from('Bookings').insert([
    {
      created_at,
      Seat_id,
      Seat_Number: Seat_Number_db,
      Timeslot: timeslotToStore,
      Name: bookedUserName,
      User_id
    }
  ]);

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: error.message, details: error.details, body: req.body });
  }
  res.status(201).json({ data });

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
  