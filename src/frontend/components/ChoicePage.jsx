import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getBookingsByUser, editBooking, deleteBooking } from '../services/bookingService';
import { toast } from 'react-toastify';
import UserBookingsModal from './UserBookingsModal';
import BookingModal from './BookingModal';
import './ChoicePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const ChoicePage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [todayBookings, setTodayBookings] = useState({ seats: [], parking: [] });
  const [recommendedSeats, setRecommendedSeats] = useState([]);
  const [recommendedParking, setRecommendedParking] = useState([]);
  const [showAllBookingsModal, setShowAllBookingsModal] = useState(false);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit booking modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  // Quick book modal state
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [quickBookSeat, setQuickBookSeat] = useState(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Fetch today's bookings
  useEffect(() => {
    if (!userId) return;

    const fetchTodayBookings = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // Fetch seat bookings
        const seatRes = await getBookingsByUser(userId);
        const seatBookings = (seatRes.bookings || []).filter(booking => {
          const bookingDate = (booking.created_at || '').split('T')[0];
          return bookingDate === today;
        });

        // Fetch parking bookings
        const parkingRes = await fetch(`${API_BASE_URL}/api/parking/bookings/user/${userId}?active=true`);
        const parkingData = await parkingRes.json();
        const parkingBookings = (parkingData.bookings || []).filter(booking => {
          const startDate = new Date(booking.start_time).toISOString().split('T')[0];
          return startDate === today;
        });

        setTodayBookings({ seats: seatBookings, parking: parkingBookings });
      } catch (error) {
        console.error('Error fetching today\'s bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayBookings();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodayBookings, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch recommended available seats and parking
  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch bookings for all sections today
        const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const promises = sections.map(section => 
          fetch(`${API_BASE_URL}/api/bookings/section/${section}/date/${today}`)
            .then(res => res.json())
        );
        
        const results = await Promise.all(promises);
        const bookedSeats = new Set();
        results.forEach(({ bookings }) => {
          (bookings || []).forEach(b => bookedSeats.add(b.Seat_Number));
        });

        // Get all seats
        const seatsRes = await fetch(`${API_BASE_URL}/api/seats`);
        const { seats } = await seatsRes.json();
        
        // Find 1 available seat (random)
        const available = seats.filter(s => !bookedSeats.has(s.Seat_Number));
        const randomSeat = available.length > 0 
          ? [available[Math.floor(Math.random() * available.length)]]
          : [];
        
        setRecommendedSeats(randomSeat);
        console.log('Recommended seats:', randomSeat);

        // Fetch 1 available parking slot
        // Add 1 minute buffer to ensure start time is in the future
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); // Add 1 minute to avoid "start time in the past" error
        const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours from adjusted start
        
        try {
          const parkingRes = await fetch(
            `${API_BASE_URL}/api/parking/availability?from=${now.toISOString()}&to=${endTime.toISOString()}`
          );
          
          if (parkingRes.ok) {
            const parkingData = await parkingRes.json();
            console.log('Parking API response:', parkingData);
            const { slots } = parkingData;
            
            const availableParking = (slots || []).filter(s => s.is_available);
            console.log('Available parking slots:', availableParking);
            
            const randomParking = availableParking.length > 0
              ? [availableParking[Math.floor(Math.random() * availableParking.length)]]
              : [];
            
            console.log('Recommended parking:', randomParking);
            setRecommendedParking(randomParking);
          } else {
            console.error('Parking API error:', parkingRes.status);
            const errorData = await parkingRes.json().catch(() => ({}));
            console.error('Parking API error details:', errorData);
            setRecommendedParking([]);
          }
        } catch (parkingError) {
          console.error('Error fetching parking:', parkingError);
          setRecommendedParking([]);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    };

    fetchRecommended();
    const interval = setInterval(fetchRecommended, 45000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all bookings when modal opens
  const handleOpenAllBookings = async () => {
    if (!userId) return;
    try {
      const seatRes = await getBookingsByUser(userId);
      setAllBookings(seatRes.bookings || []);
      setShowAllBookingsModal(true);
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      toast.error('Failed to fetch bookings');
    }
  };

  const handleCancelBooking = async (bookingId, isParking = false) => {
    try {
      const endpoint = isParking 
        ? `${API_BASE_URL}/api/parking/bookings/${bookingId}`
        : `${API_BASE_URL}/api/bookings/${bookingId}`;
      
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) throw new Error('Failed to cancel booking');
      
      toast.success('Booking cancelled successfully');
      
      // Refresh bookings
      await refreshTodayBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await editBooking(editingBooking.Booking_id, updatedData);
      toast.success('Booking updated successfully');
      setShowEditModal(false);
      setEditingBooking(null);
      await refreshTodayBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    }
  };

  const handleQuickBook = (seat) => {
    setQuickBookSeat(seat);
    setShowQuickBookModal(true);
  };

  const handleQuickBookSubmit = async (bookingData) => {
    try {
      // BookingModal sends { seatLabel, date, timeslot }
      // API expects { Seat_id, created_at, Timeslot, User_id }
      // Use the Seat_id from quickBookSeat (which has the full seat object)
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Seat_id: quickBookSeat.Seat_id, // Use the UUID from the seat object
          created_at: bookingData.date,
          Timeslot: bookingData.timeslot,
          User_id: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      toast.success('Seat booked successfully!');
      setShowQuickBookModal(false);
      setQuickBookSeat(null);
      await refreshTodayBookings();
    } catch (error) {
      console.error('Error booking seat:', error);
      toast.error(error.message || 'Failed to book seat');
    }
  };

  const refreshTodayBookings = async () => {
    if (!userId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const seatRes = await getBookingsByUser(userId);
    const seatBookings = (seatRes.bookings || []).filter(booking => {
      const bookingDate = (booking.created_at || '').split('T')[0];
      return bookingDate === today;
    });

    const parkingRes = await fetch(`${API_BASE_URL}/api/parking/bookings/user/${userId}?active=true`);
    const parkingData = await parkingRes.json();
    const parkingBookings = (parkingData.bookings || []).filter(booking => {
      const startDate = new Date(booking.start_time).toISOString().split('T')[0];
      return startDate === today;
    });

    setTodayBookings({ seats: seatBookings, parking: parkingBookings });
  };

  const totalToday = todayBookings.seats.length + todayBookings.parking.length;

  return (
    <div className="choice-page-container">
      <div className="choice-page-content">
        {/* Header */}
        <div className="choice-page-header">
          <h1 className="welcome-title">Welcome to <span className="brand-reserve">R</span>eserve<span className="brand-now">N</span>ow</h1>
          <p className="choice-page-subtitle">Your workspace booking dashboard</p>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* My Bookings Today - Left Column */}
          <div className="dashboard-section my-bookings-section">
            <div className="section-header">
              <h2>My Bookings Today</h2>
              <button 
                className="view-all-btn"
                onClick={handleOpenAllBookings}
              >
                View All
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : totalToday === 0 ? (
              <div className="empty-state">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No bookings for today</p>
                <span className="empty-hint">Book a seat or parking slot to get started</span>
              </div>
            ) : (
              <div className="today-bookings-list">
                {todayBookings.seats.map((booking, idx) => (
                  <div key={`seat-${idx}`} className="booking-item seat-booking">
                    <div className="booking-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="booking-details">
                      <div className="booking-title">Seat {booking.Seat_Number}</div>
                      <div className="booking-meta">
                        {(() => {
                          let timeslots = [];
                          try {
                            if (typeof booking.Timeslot === 'string') {
                              const parsed = JSON.parse(booking.Timeslot);
                              timeslots = parsed.timeslot || [];
                            } else if (booking.Timeslot?.timeslot) {
                              timeslots = booking.Timeslot.timeslot;
                            }
                          } catch (e) {}
                          
                          return timeslots.map((slot, i) => (
                            <span key={i}>{slot[0]} - {slot[1]}{i < timeslots.length - 1 ? ', ' : ''}</span>
                          ));
                        })()}
                      </div>
                    </div>
                    <div className="booking-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditBooking(booking)}
                        title="Edit booking"
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        className="cancel-btn"
                        onClick={() => handleCancelBooking(booking.Booking_id, false)}
                        title="Cancel booking"
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {todayBookings.parking.map((booking, idx) => (
                  <div key={`parking-${idx}`} className="booking-item parking-booking">
                    <div className="booking-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </div>
                    <div className="booking-details">
                      <div className="booking-title">Parking Slot {booking.slot_id}</div>
                      <div className="booking-meta">
                        {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="booking-actions">
                      <button 
                        className="cancel-btn"
                        onClick={() => handleCancelBooking(booking.id, true)}
                        title="Cancel booking"
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Quick Actions & Recommendations */}
          <div className="right-column">
            {/* Quick Actions */}
            <div className="dashboard-section quick-actions">
              <h2 className="section-title">Quick Actions</h2>
              <div className="action-buttons">
                <button className="action-btn seat-action" onClick={() => navigate('/seat-booking')}>
                  <div className="action-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span>Book Seat</span>
                </button>
                <button className="action-btn parking-action" onClick={() => navigate('/parking-booking')}>
                  <div className="action-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <span>Book Parking</span>
                </button>
              </div>
            </div>

            {/* Recommended Seats */}
            <div className="dashboard-section recommendations">
              <h2 className="section-title">Available Now</h2>
              
              {recommendedSeats.length > 0 && (
                <div className="recommendation-group">
                  <h3 className="recommendation-subtitle">Seat</h3>
                  <div className="recommendation-list">
                    {recommendedSeats.map((seat, idx) => (
                      <div 
                        key={idx} 
                        className="recommendation-item" 
                        onClick={() => handleQuickBook(seat)}
                      >
                        <div className="rec-icon seat-rec">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span>Seat {seat.Seat_Number}</span>
                        <svg className="arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendedParking.length > 0 && (
                <div className="recommendation-group">
                  <h3 className="recommendation-subtitle">Parking</h3>
                  <div className="recommendation-list">
                    {recommendedParking.map((slot, idx) => (
                      <div 
                        key={idx} 
                        className="recommendation-item" 
                        onClick={() => navigate('/parking-booking')}
                      >
                        <div className="rec-icon parking-rec">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span>Slot {slot.id} ({slot.vehicle_type === 'two' ? '2-Wheeler' : '4-Wheeler'})</span>
                        <svg className="arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendedSeats.length === 0 && recommendedParking.length === 0 && (
                <div className="no-recommendations">
                  <p>No available slots at the moment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Modal */}
      <UserBookingsModal
        isOpen={showAllBookingsModal}
        onClose={() => setShowAllBookingsModal(false)}
        bookings={allBookings}
      />

      {/* Edit Booking Modal */}
      {editingBooking && (
        <BookingModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBooking(null);
          }}
          seatLabel={editingBooking.Seat_Number}
          onBook={handleSaveEdit}
          bookingId={editingBooking.Booking_id}
          isEdit={true}
          bookingDetails={editingBooking}
          preselectedRange={(() => {
            try {
              let timeslots = [];
              if (typeof editingBooking.Timeslot === 'string') {
                const parsed = JSON.parse(editingBooking.Timeslot);
                timeslots = parsed.timeslot || [];
              } else if (editingBooking.Timeslot?.timeslot) {
                timeslots = editingBooking.Timeslot.timeslot;
              }
              return timeslots.length > 0 ? timeslots[0] : null;
            } catch (e) {
              return null;
            }
          })()}
        />
      )}

      {/* Quick Book Modal */}
      {quickBookSeat && (
        <BookingModal
          isOpen={showQuickBookModal}
          onClose={() => {
            setShowQuickBookModal(false);
            setQuickBookSeat(null);
          }}
          seatLabel={quickBookSeat.Seat_Number}
          onBook={handleQuickBookSubmit}
          isEdit={false}
        />
      )}

      {/* Small Cprime Logo - Bottom Right */}
      <div className="cprime-logo">
        <span className="c-text">c</span><span className="prime-text">prime</span>
      </div>
    </div>
  );
};

export default ChoicePage;
