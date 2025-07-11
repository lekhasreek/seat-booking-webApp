import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/bookings/date/:date/timeslot/:timeslot - Return bookings for a date and timeslot
app.get('/api/bookings/date/:date/timeslot/:timeslot', async (req, res) => {
  const { date, timeslot } = req.params;
  try {
    // Date is in YYYY-MM-DD format, match against created_at (date part only)
    // Timeslot is a string (e.g., 'morning', 'afternoon', etc.)
    const { data, error } = await supabase
      .from('Bookings')
      .select('*')
      .eq('Timeslot', timeslot)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);
const app = express();
app.use(cors());
app.use(express.json());

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
// GET /api/bookings/section/:section/date/:date/timeslot/:timeslot - Return bookings for a section, date, and timeslot
app.get('/api/bookings/section/:section/date/:date/timeslot/:timeslot', async (req, res) => {
  const { section, date, timeslot } = req.params;
  try {
    // Section is a letter (e.g., 'A'), Seat_Number is like 'A1', 'A2', etc.
    // Date is in YYYY-MM-DD format, match against created_at (date part only)
    // Timeslot is a string (e.g., 'morning', 'afternoon', etc.)
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
// GET /api/bookings/section/:section/date/:date - Return bookings for a section and date
app.get('/api/bookings/section/:section/date/:date', async (req, res) => {
  const { section, date } = req.params;
  try {
    // Section is a letter (e.g., 'A'), Seat_Number is like 'A1', 'A2', etc.
    // Date is in YYYY-MM-DD format, match against created_at (date part only)
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

// GET /api/bookings - Return all bookings with seat and user info
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


// Connect to Supabase (backend)
import { supabase } from './supabaseClient.js';

// POST /api/bookings - Insert a new booking
app.post('/api/bookings', async (req, res) => {
  // ...existing code...
  let { created_at, Seat_Number, Timeslot, Name } = req.body;
  // Accept both Seat_Number and Seat_id for backward compatibility
  let seatLabel = Seat_Number || req.body.Seat_id;
  if (!created_at || !seatLabel || !Timeslot || !Name) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields', body: req.body });
  }
  // If seatLabel is like 'Square-A1', extract 'A1'
  if (typeof seatLabel === 'string' && seatLabel.startsWith('Square-')) {
    seatLabel = seatLabel.replace('Square-', '');
  }
  // Look up Seat_id and Seat_Number from Seats table using seatLabel
  const { data: seatRows, error: seatError } = await supabase
    .from('Seats')
    .select('Seat_id, Seat_Number')
    .eq('Seat_Number', seatLabel)
    .maybeSingle();
  if (seatError || !seatRows || !seatRows.Seat_id || !seatRows.Seat_Number) {
    console.error('Seat lookup failed:', seatError, seatRows);
    return res.status(400).json({ error: 'Invalid seat label', details: seatError, seatLabel });
  }
  const Seat_id = seatRows.Seat_id;
  const Seat_Number_db = seatRows.Seat_Number;

  // Debug: print Name being searched
  console.log('Looking up user with Name:', Name);
  const { data: userRows, error: userError } = await supabase
    .from('Users')
    .select('User_id, Name')
    .ilike('Name', Name)
    .maybeSingle();
  console.log('User lookup result:', userRows, 'Error:', userError);
  if (userError || !userRows || !userRows.User_id) {
    console.error('User lookup failed:', userError, userRows);
    return res.status(400).json({ error: 'Invalid user name', details: userError, Name });
  }
  const User_id = userRows.User_id;

  const { data, error } = await supabase.from('Bookings').insert([
    {
      created_at,
      Seat_id,
      Seat_Number: Seat_Number_db,
      Timeslot,
      Name,
      User_id
    }
  ]);
  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: error.message, details: error.details, body: req.body });
  }
  res.status(201).json({ data });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});