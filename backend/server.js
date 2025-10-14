import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './supabaseClient.js';
import parkingAPI from './parking.js';

dotenv.config();

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://seat-booking-webapp.vercel.app', /\.vercel\.app$/, /\.onrender\.com$/]
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================
// PARKING BOOKING API ENDPOINTS (Time-based)
// ============================================

// GET /api/parking/availability - Check parking slot availability for a time range
app.get('/api/parking/availability', parkingAPI.getAvailability);

// POST /api/parking/book - Create a new parking booking
app.post('/api/parking/book', parkingAPI.createBooking);

// GET /api/parking/bookings/user/:userId - Get all bookings for a user
app.get('/api/parking/bookings/user/:userId', parkingAPI.getUserBookings);

// GET /api/parking/bookings/:bookingId - Get a specific booking
app.get('/api/parking/bookings/:bookingId', parkingAPI.getBookingById);

// DELETE /api/parking/bookings/:bookingId - Cancel a booking
app.delete('/api/parking/bookings/:bookingId', parkingAPI.cancelBooking);

// GET /api/parking/slots/:slotId/bookings - Get all bookings for a slot
app.get('/api/parking/slots/:slotId/bookings', parkingAPI.getSlotBookings);

// ============================================
// SEAT BOOKING API ENDPOINTS (Existing)
// ============================================

// GET /api/bookings/user/:userId - Return all bookings for a user
app.get('/api/bookings/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from('Bookings').select('*').eq('User_id', userId);
    if (error) return res.status(500).json({ error: error.message, details: error.details });
    res.json({ bookings: data });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
});

// GET /api/seats - Return all seats from the 'Seats' table
app.get('/api/seats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('Seats').select('Seat_id, Seat_Number, Status');
    if (error) return res.status(500).json({ error: error.message, details: error.details });
    res.json({ seats: data });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
});

      // GET bookings by date/timeslot
      app.get('/api/bookings/date/:date/timeslot/:timeslot', async (req, res) => {
        const { date, timeslot } = req.params;
        try {
          const { data, error } = await supabase
            .from('Bookings')
            .select('*')
            .eq('Timeslot', timeslot)
            .gte('created_at', `${date}T00:00:00`)
            .lte('created_at', `${date}T23:59:59`);
          if (error) return res.status(500).json({ error: error.message, details: error.details });
          res.json({ bookings: data });
        } catch (err) {
          res.status(500).json({ error: 'Unexpected error', details: err.message });
        }
      });

      // GET bookings by section/date/timeslot
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
          if (error) return res.status(500).json({ error: error.message, details: error.details });
          res.json({ bookings: data });
        } catch (err) {
          res.status(500).json({ error: 'Unexpected error', details: err.message });
        }
      });

      // GET bookings by section/date
      app.get('/api/bookings/section/:section/date/:date', async (req, res) => {
        const { section, date } = req.params;
        try {
          const { data, error } = await supabase
            .from('Bookings')
            .select('*')
            .ilike('Seat_Number', `${section}%`)
            .gte('created_at', `${date}T00:00:00`)
            .lte('created_at', `${date}T23:59:59`);
          if (error) return res.status(500).json({ error: error.message, details: error.details });
          res.json({ bookings: data });
        } catch (err) {
          res.status(500).json({ error: 'Unexpected error', details: err.message });
        }
      });

      // GET all bookings
      app.get('/api/bookings', async (req, res) => {
        try {
          const { data, error } = await supabase.from('Bookings').select('*');
          if (error) return res.status(500).json({ error: error.message, details: error.details });
          res.json({ bookings: data });
        } catch (err) {
          res.status(500).json({ error: 'Unexpected error', details: err.message });
        }
      });

      // GET user by id
      app.get('/api/users/:userId', async (req, res) => {
        const { userId } = req.params;
        try {
          const { data, error } = await supabase.from('Users').select('*').eq('User_id', userId).maybeSingle();
          if (error) return res.status(500).json({ error: error.message });
          res.json(data || {});
        } catch (err) {
          res.status(500).json({ error: 'Unexpected error', details: err.message });
        }
      });

      // POST /api/bookings - insert booking(s)
      app.post('/api/bookings', async (req, res) => {
        let { created_at, Timeslot, User_id } = req.body;
        let seatLabel = req.body.Seat_id;

        if (!created_at || !seatLabel || !Timeslot || !User_id) {
          return res.status(400).json({ error: 'Missing required fields', body: req.body });
        }

        if (typeof seatLabel === 'string' && seatLabel.startsWith('Square-')) {
          seatLabel = seatLabel.replace('Square-', '');
        }

        const { data: seatRows, error: seatError } = await supabase
          .from('Seats')
          .select('Seat_id, Seat_Number')
          .eq('Seat_id', seatLabel)
          .maybeSingle();

        if (seatError || !seatRows || !seatRows.Seat_id) {
          return res.status(400).json({ error: 'Invalid Seat_id or seat not found', details: seatError, seatLabel });
        }

        const Seat_id = seatRows.Seat_id;
        const Seat_Number_db = seatRows.Seat_Number;

        // Collect existing bookings for the seat/date
        const { data: existingBookings, error: existingBookingError } = await supabase
          .from('Bookings')
          .select('Booking_id, Timeslot')
          .eq('Seat_id', Seat_id)
          .gte('created_at', `${created_at}T00:00:00.000Z`)
          .lte('created_at', `${created_at}T23:59:59.999Z`);

        if (existingBookingError) {
          return res.status(500).json({ error: 'Error checking for existing booking', details: existingBookingError.message });
        }

        // Parse requested timeslots
        let requestedTimeslots = [];
        try {
          if (typeof Timeslot === 'string') {
            requestedTimeslots = JSON.parse(Timeslot).timeslot;
          } else if (typeof Timeslot === 'object' && Timeslot.timeslot) {
            requestedTimeslots = Timeslot.timeslot;
          }
          if (!Array.isArray(requestedTimeslots)) throw new Error('Invalid timeslot format');
        } catch (e) {
          return res.status(400).json({ error: 'Invalid Timeslot format. Must be JSON: { timeslot: [["09:00", "14:00"]] }' });
        }

        // Flatten existing timeslots
        const existingFlat = [];
        for (const booking of existingBookings) {
          try {
            let ets = [];
            if (typeof booking.Timeslot === 'string') {
              ets = JSON.parse(booking.Timeslot).timeslot || [];
            } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
              ets = booking.Timeslot.timeslot;
            }
            if (Array.isArray(ets)) ets.forEach(([s, e]) => existingFlat.push([s, e]));
          } catch (err) {
            // ignore
          }
        }

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
            if (overlaps(req, exist)) { hasConflict = true; break; }
          }
          if (hasConflict) conflicts.push(req); else nonConflicting.push(req);
        }

        if (nonConflicting.length === 0) return res.status(409).json({ error: 'All requested timeslots conflict with existing bookings.', conflicts });

        // Lookup user name
        const { data: userRows, error: userError } = await supabase.from('Users').select('User_id, Name').eq('User_id', User_id).maybeSingle();
        if (userError || !userRows || !userRows.User_id || !userRows.Name) return res.status(400).json({ error: 'Invalid user ID or user not found', details: userError, User_id });
        const bookedUserName = userRows.Name;

        // Insert a single booking row for this seat with all non-conflicting timeslots
        const insertObj = {
          created_at,
          Seat_id,
          Seat_Number: Seat_Number_db,
          Timeslot: { timeslot: nonConflicting },
          Name: bookedUserName,
          User_id,
        };

        try {
          const { data: inserted, error: insertError } = await supabase.from('Bookings').insert([insertObj]);
          if (insertError) return res.status(500).json({ error: insertError.message, details: insertError.details, body: req.body });
          const response = { inserted };
          if (conflicts.length > 0) response.conflicts = conflicts;
          return res.status(201).json(response);
        } catch (err) {
          return res.status(500).json({ error: 'Unexpected server error', details: err.message });
        }
      });

// DELETE booking
app.delete('/api/bookings/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  try {
    const { error } = await supabase.from('Bookings').delete().eq('Booking_id', bookingId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
});

// PUT booking - edit or delete-if-empty timeslot
app.put('/api/bookings/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  const updateFields = req.body;
  try {
    // If Timeslot is present and explicitly empty -> delete
    if (updateFields.Timeslot) {
      let isEmptyTimeslot = false;
      try {
        if (typeof updateFields.Timeslot === 'string') {
          const parsed = JSON.parse(updateFields.Timeslot);
          isEmptyTimeslot = Array.isArray(parsed.timeslot) && parsed.timeslot.length === 0;
        } else if (typeof updateFields.Timeslot === 'object' && Array.isArray(updateFields.Timeslot.timeslot)) {
          isEmptyTimeslot = updateFields.Timeslot.timeslot.length === 0;
        }
      } catch (e) {
        isEmptyTimeslot = false;
      }

      if (isEmptyTimeslot) {
        const { error } = await supabase.from('Bookings').delete().eq('Booking_id', bookingId);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, deleted: true });
      }

      // Otherwise perform overlap checks against other bookings for same seat/date
      let requestedTimeslots = [];
      try {
        if (typeof updateFields.Timeslot === 'string') {
          requestedTimeslots = JSON.parse(updateFields.Timeslot).timeslot || [];
        } else if (typeof updateFields.Timeslot === 'object' && updateFields.Timeslot.timeslot) {
          requestedTimeslots = updateFields.Timeslot.timeslot;
        }
        if (!Array.isArray(requestedTimeslots)) requestedTimeslots = [];
      } catch (err) {
        requestedTimeslots = [];
      }

      const { data: existingBooking, error: fetchErr } = await supabase.from('Bookings').select('Booking_id, Seat_id, created_at, Timeslot').eq('Booking_id', bookingId).maybeSingle();
      if (fetchErr || !existingBooking) return res.status(400).json({ error: 'Booking not found for update' });

      const seatId = updateFields.Seat_id || existingBooking.Seat_id;
      let createdAt = updateFields.created_at || existingBooking.created_at;
      // Only append T00:00:00.000Z if createdAt is just a date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
        createdAt = createdAt;
      } else if (/^\d{4}-\d{2}-\d{2}T/.test(createdAt)) {
        // If already has T, strip time for day matching
        createdAt = createdAt.slice(0, 10);
      }
      const startOfDay = `${createdAt}T00:00:00.000Z`;
      const endOfDay = `${createdAt}T23:59:59.999Z`;

      const { data: otherBookings, error: otherErr } = await supabase
        .from('Bookings')
        .select('Booking_id, Timeslot')
        .eq('Seat_id', seatId)
        .neq('Booking_id', bookingId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);
      if (otherErr) return res.status(500).json({ error: otherErr.message });

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
          if (overlaps(req, exist)) return res.status(409).json({ error: 'Requested timeslot overlaps with another booking.' });
        }
      }
    }

    const { error } = await supabase.from('Bookings').update(updateFields).eq('Booking_id', bookingId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error', details: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
 
