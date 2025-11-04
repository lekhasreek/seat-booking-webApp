import { supabase } from './backend/supabaseClient.js';

async function testIntegrationFlow() {
  try {
    // 1. First, let's set up a test user as a vehicle holder
    const testUserId = 'test-user-123';
    console.log('Setting up test user as vehicle holder...');
    
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .upsert({
        User_id: testUserId,
        email: 'test@example.com',
        Name: 'Test User',
        vehicle_holder: true,
        vehicle_type: 'two'
      })
      .select()
      .single();

    if (userError) throw userError;
    console.log('Test user configured:', userData);

    // 2. Create a test seat booking
    const seatBookingData = {
      created_at: new Date().toISOString().split('T')[0],
      Seat_id: 'test-seat-123',
      Timeslot: { timeslot: [['09:00', '17:00']] },
      User_id: testUserId
    };

    console.log('Creating test seat booking...');
    const { data: bookingData, error: bookingError } = await supabase
      .from('Bookings')
      .insert([seatBookingData])
      .select()
      .single();

    if (bookingError) throw bookingError;
    console.log('Test booking created:', bookingData);

    // 3. Verify vehicle holder status
    console.log('Verifying vehicle holder status...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('Users')
      .select('vehicle_holder, vehicle_type')
      .eq('User_id', testUserId)
      .single();

    if (verifyError) throw verifyError;
    console.log('Vehicle holder status:', verifyData);

    // Success!
    console.log('✅ Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegrationFlow();