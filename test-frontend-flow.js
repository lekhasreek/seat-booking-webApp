import { supabase } from './src/frontend/supabaseClient.js';

async function testSeatBookingFlow() {
  console.log('Starting seat booking flow test...');
  
  try {
    // 1. Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
      console.log('❌ Test failed: No authenticated user found');
      return;
    }
    
    console.log('✓ Got current user:', user.email);

    // 2. Check vehicle holder status
    const { data: userData, error: userDataError } = await supabase
      .from('Users')
      .select('vehicle_holder, vehicle_type')
      .eq('User_id', user.id)
      .single();
    
    if (userDataError) throw userDataError;
    console.log('✓ User vehicle status:', userData);

    // 3. Create a test seat booking
    const today = new Date().toISOString().split('T')[0];
    const seatBooking = {
      created_at: today,
      Timeslot: { timeslot: [['14:00', '16:00']] }
    };

    console.log('Attempting to book seat...');
    const { data: bookingData, error: bookingError } = await supabase
      .from('Bookings')
      .insert([{
        ...seatBooking,
        User_id: user.id,
        // We'll use a test seat ID - in production this would come from your seat selection
        Seat_id: 'test-seat-1' 
      }]);

    if (bookingError) throw bookingError;
    console.log('✓ Seat booking created:', bookingData);

    // Success!
    console.log('✅ All tests passed!');
    console.log(`
Test Results:
------------
1. User Authentication: PASSED
2. Vehicle Status Check: PASSED
3. Seat Booking: PASSED
    `);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSeatBookingFlow();