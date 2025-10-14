import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './ParkingBooking.css';
import { useNavigate } from 'react-router-dom';
import userAvatar from '/user-blue.png';
import cprimeLogo from '/cprime-logo.png';
import UserPopover from './UserPopover';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const ParkingBooking = ({ userId }) => {
  const navigate = useNavigate();
  
  // State management
  const [slots, setSlots] = useState([]);
  const [currentView, setCurrentView] = useState('two');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Time range state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [minDateTime, setMinDateTime] = useState('');
  const [maxDateTime, setMaxDateTime] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: '',
  });

  // Initialize default times (next hour to 2 hours from now)
  useEffect(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    
    const twoHoursLater = new Date(nextHour);
    twoHoursLater.setHours(nextHour.getHours() + 2);

    // Set min datetime to now
    setMinDateTime(formatDateTimeLocal(now));
    
    // Set max datetime to end of tomorrow
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(now.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 0, 0);
    setMaxDateTime(formatDateTimeLocal(endOfTomorrow));

    setStartTime(formatDateTimeLocal(nextHour));
    setEndTime(formatDateTimeLocal(twoHoursLater));
  }, []);

  // Format date for datetime-local input
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Show toast notification
  const showNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Smart handler for start time change
  const handleStartTimeChange = (e) => {
    const newStartTime = e.target.value;
    setStartTime(newStartTime);
    
    // Auto-adjust end time if needed
    if (newStartTime && endTime) {
      const start = new Date(newStartTime);
      const end = new Date(endTime);
      
      // If end time is before or equal to start time, set it to 2 hours after start
      if (end <= start) {
        const newEnd = new Date(start);
        newEnd.setHours(start.getHours() + 2);
        
        // Make sure new end time doesn't exceed max allowed time
        const maxAllowed = new Date(maxDateTime);
        if (newEnd > maxAllowed) {
          setEndTime(maxDateTime);
        } else {
          setEndTime(formatDateTimeLocal(newEnd));
        }
      }
      
      // If duration exceeds 24 hours, cap it
      const duration = end - start;
      const maxDuration = 24 * 60 * 60 * 1000;
      if (duration > maxDuration) {
        const cappedEnd = new Date(start);
        cappedEnd.setHours(start.getHours() + 24);
        
        const maxAllowed = new Date(maxDateTime);
        if (cappedEnd > maxAllowed) {
          setEndTime(maxDateTime);
        } else {
          setEndTime(formatDateTimeLocal(cappedEnd));
        }
      }
    } else if (newStartTime && !endTime) {
      // If no end time set, default to 2 hours after start
      const start = new Date(newStartTime);
      const newEnd = new Date(start);
      newEnd.setHours(start.getHours() + 2);
      
      const maxAllowed = new Date(maxDateTime);
      if (newEnd > maxAllowed) {
        setEndTime(maxDateTime);
      } else {
        setEndTime(formatDateTimeLocal(newEnd));
      }
    }
  };

  // Smart handler for end time change
  const handleEndTimeChange = (e) => {
    const newEndTime = e.target.value;
    setEndTime(newEndTime);
    
    // Check if duration exceeds 24 hours and auto-adjust
    if (startTime && newEndTime) {
      const start = new Date(startTime);
      const end = new Date(newEndTime);
      const duration = end - start;
      const maxDuration = 24 * 60 * 60 * 1000;
      
      if (duration > maxDuration) {
        // Cap to 24 hours from start
        const cappedEnd = new Date(start);
        cappedEnd.setHours(start.getHours() + 24);
        
        const maxAllowed = new Date(maxDateTime);
        if (cappedEnd > maxAllowed) {
          setEndTime(maxDateTime);
        } else {
          setEndTime(formatDateTimeLocal(cappedEnd));
        }
        showNotification('Duration capped at 24 hours maximum');
      }
    }
  };

  const resolveSlotLabel = (slot) => {
    if (!slot) return '';
    return String(slot.display_label ?? slot.slot_code ?? slot.code ?? slot.name ?? slot.id ?? '');
  };

  const getSlotOrderIndex = (slot) => {
    const label = resolveSlotLabel(slot);
    const match = label.match(/\d+/);
    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sortSlots = (slotsArray) => {
    return [...slotsArray].sort((a, b) => {
      const orderDiff = getSlotOrderIndex(a) - getSlotOrderIndex(b);
      if (orderDiff !== 0) return orderDiff;

      const labelA = resolveSlotLabel(a);
      const labelB = resolveSlotLabel(b);
      return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  // Fetch parking availability from API
  const fetchAvailability = async () => {
    if (!startTime || !endTime) {
      showNotification('Please select both start and end times');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Validation 1: Start time must not be in the past
    if (start < now) {
      showNotification('Start time cannot be in the past');
      return;
    }

    // Validation 2: End time must be after start time
    if (end <= start) {
      showNotification('End time must be after start time');
      return;
    }

    // Validation 3: Booking duration must not exceed 24 hours
    const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const duration = end - start;
    if (duration > maxDuration) {
      showNotification('Booking duration cannot exceed 24 hours');
      return;
    }

    // Validation 4: Cannot book more than 1 day in advance
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    oneDayFromNow.setHours(23, 59, 59, 999); // End of tomorrow
    
    if (start > oneDayFromNow) {
      showNotification('You can only book up to 1 day in advance (today and tomorrow)');
      return;
    }

    setLoading(true);
    try {
      const vehicleType = currentView; // 'two' or 'four'
      const response = await fetch(
        `${API_BASE_URL}/api/parking/availability?from=${start.toISOString()}&to=${end.toISOString()}&vehicleType=${vehicleType}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setSlots(sortSlots(data.slots || []));
      setHasSearched(true);
    } catch (error) {
      console.error('Error fetching availability:', error);
      showNotification('Error loading parking availability');
    } finally {
      setLoading(false);
    }
  };

  // Fetch availability when view changes
  useEffect(() => {
    if (hasSearched && startTime && endTime) {
      fetchAvailability();
    }
  }, [currentView]);

  // Set up real-time subscription for parking bookings
  useEffect(() => {
    const channel = supabase
      .channel('parking_bookings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_bookings' },
        (payload) => {
          console.log('Parking booking changed:', payload);
          // Refresh availability when any booking changes
          if (hasSearched && startTime && endTime) {
            fetchAvailability();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasSearched, startTime, endTime, currentView]);

  // Handle slot click
  const handleSlotClick = (slot) => {
    if (!hasSearched) {
      showNotification('Please search for availability first');
      return;
    }

    if (slot.is_available) {
      setSelectedSlot(slot);
      setShowBookingModal(true);
      setFormData({ vehicleNumber: '' });
    } else {
      setSelectedSlotDetails(slot);
      setShowDetailsModal(true);
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.vehicleNumber.trim()) {
      showNotification('Vehicle number is required');
      return false;
    }
    return true;
  };

  // Handle booking confirm
  const handleBookingConfirm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/parking/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          vehicle_number: formData.vehicleNumber,
          user_id: userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book slot');
      }

      showNotification(`Slot ${selectedSlot.id} booked successfully!`);
      setShowBookingModal(false);
      setSelectedSlot(null);
      fetchAvailability(); // Refresh availability
    } catch (error) {
      console.error('Error booking slot:', error);
      showNotification(error.message || 'Error booking slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/parking/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      showNotification('Booking cancelled successfully!');
      setShowDetailsModal(false);
      setSelectedSlotDetails(null);
      fetchAvailability();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showNotification('Error cancelling booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get current slots based on view
  const getCurrentSlots = () => {
    return slots.filter(slot => slot.vehicle_type === currentView);
  };

  // Calculate booking duration for display
  const getBookingDuration = () => {
    if (!startTime || !endTime) return '';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    if (diffMs <= 0) return '';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
  };

  const currentSlots = getCurrentSlots();
  const currentSectionTitle = currentView === 'two' ? 'Two Wheeler Parking' : 'Four Wheeler Parking';
  const totalSlots = currentSlots.length;
  const availableCount = currentSlots.filter(s => s.is_available).length;
  const bookedCount = currentSlots.filter(s => !s.is_available).length;

  return (
    <div className="parking-container">
      <div className="back-link-row" style={{ alignItems: 'flex-start', marginBottom: '0.5rem', position: 'relative' }}>
        <button className="back-link" onClick={() => navigate('/dashboard')}>
          &lt; Back to dashboard
        </button>
        <div className="header-right-box" style={{ position: 'absolute', right: 0, top: '0px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', border: '1.5px solid #dcdfe6', borderRadius: '12px', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', height: '64px', overflow: 'visible', zIndex: 100 }}>
          <img src={cprimeLogo} alt="Cprime Logo" className="cprime-logo-in-header" style={{ height: 36, width: 'auto', marginRight: 2 }} />
          <UserPopover avatarSize={48} showBookingsBtn={false} />
        </div>
      </div>

      <div className="parking-main">
        <header className="parking-header">
          <div className="header-text">
            <h1 className="parking-title">ParkEase</h1>
            <p className="parking-subtitle">Time-based Parking Slot Booking</p>
          </div>
        </header>

        <div className="content-container">
          {/* Time Range Selection */}
          <div className="time-range-selector">
            <h3 className="time-selector-title">Select Your Parking Time</h3>
            <p className="time-selector-info">📅 You can book for today and tomorrow only (max 24 hours)</p>
            <div className="time-inputs-row">
              <div className="time-input-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  className="time-input"
                  min={minDateTime}
                  max={maxDateTime}
                />
              </div>
              <div className="time-input-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  className="time-input"
                  min={startTime || minDateTime}
                  max={maxDateTime}
                />
              </div>
              <button 
                className="search-btn"
                onClick={fetchAvailability}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Check Availability'}
              </button>
            </div>
            {getBookingDuration() && (
              <div className="duration-display">
                ⏱️ Duration: <strong>{getBookingDuration()}</strong>
              </div>
            )}
          </div>

          {/* Time Range Banner (shown after search) */}
          {hasSearched && (
            <div className="time-range-banner">
              <div className="banner-text">
                <strong>Showing availability:</strong> {formatDateTime(startTime)} – {formatDateTime(endTime)}
              </div>
            </div>
          )}

          <div className="section-header">
            <h2 className="section-title">{currentSectionTitle}</h2>
            {hasSearched && (
              <p className="section-subtitle">
                Total: {totalSlots} | Available: <span className="count-available">{availableCount}</span> | Booked: <span className="count-booked">{bookedCount}</span>
              </p>
            )}
          </div>

          {/* Vehicle Type Selector */}
          <div className="vehicle-selector-container">
            <div className="vehicle-selector">
              <button
                id="showTwoWheelers"
                className={`selector-btn ${currentView === 'two' ? 'active' : ''}`}
                onClick={() => setCurrentView('two')}
              >
                Two Wheelers
              </button>
              <button
                id="showFourWheelers"
                className={`selector-btn ${currentView === 'four' ? 'active' : ''}`}
                onClick={() => setCurrentView('four')}
              >
                Four Wheelers
              </button>
            </div>
          </div>

          {/* Parking Grids */}
          {!hasSearched ? (
            <div className="empty-state">
              <h3>Select a time range to check availability</h3>
              <p>Choose your desired start and end times, then click "Check Availability"</p>
            </div>
          ) : (
            <>
              <div className="parking-grids-container">
                <div className={`parking-grid ${currentView === 'two' ? 'two-wheeler-grid' : 'four-wheeler-grid'}`}>
                  {currentSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`slot ${slot.is_available ? 'available' : 'booked'} ${hoveredSlot === slot.id ? 'hovered' : ''}`}
                      onClick={() => handleSlotClick(slot)}
                      onMouseEnter={() => setHoveredSlot(slot.id)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      <div className="slot-id">{slot.id}</div>
                      <div className="slot-status">
                        {slot.is_available ? 'Available' : 'Booked'}
                      </div>
                      {!slot.is_available && slot.booking_count > 0 && (
                        <div className="slot-booking-count">
                          {slot.booking_count} booking{slot.booking_count > 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {/* Tooltip for booked slots */}
                      {hoveredSlot === slot.id && !slot.is_available && slot.bookings && slot.bookings.length > 0 && (
                        <div className="slot-tooltip">
                          <div className="tooltip-header">Existing Bookings</div>
                          {slot.bookings.map((booking, idx) => (
                            <div key={idx} className="tooltip-booking">
                              <div className="tooltip-time">
                                {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                              </div>
                              {booking.vehicle_number && (
                                <div className="tooltip-vehicle">{booking.vehicle_number}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="parking-legend">
                <div className="legend-item">
                  <div className="legend-color available"></div>
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color booked"></div>
                  <span>Booked</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}></div>
          <div className="modal-content">
            <h3 className="modal-title">Book Slot {selectedSlot?.id}</h3>
            <div className="booking-time-display">
              <p><strong>Start:</strong> {formatDateTime(startTime)}</p>
              <p><strong>End:</strong> {formatDateTime(endTime)}</p>
            </div>
            <form onSubmit={handleBookingConfirm}>
              <div className="form-group">
                <label htmlFor="vehicleNumber" className="form-label">
                  Vehicle Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="vehicleNumber"
                  name="vehicleNumber"
                  className="form-input"
                  placeholder="e.g., TN-01-AB-1234"
                  value={formData.vehicleNumber}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowBookingModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slot Details Modal */}
      {showDetailsModal && selectedSlotDetails && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowDetailsModal(false)}></div>
          <div className="modal-content">
            <h3 className="modal-title">Slot {selectedSlotDetails.id} - Bookings</h3>
            <div className="slot-details">
              <div className="detail-item">
                <strong>Slot ID:</strong> {selectedSlotDetails.id}
              </div>
              <div className="detail-item">
                <strong>Vehicle Type:</strong> {selectedSlotDetails.vehicle_type === 'two' ? 'Two Wheeler' : 'Four Wheeler'}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> <span className="status-booked">Occupied during selected time</span>
              </div>
              
              {selectedSlotDetails.bookings && selectedSlotDetails.bookings.length > 0 && (
                <div className="bookings-list">
                  <h4>Existing Bookings:</h4>
                  {selectedSlotDetails.bookings.map((booking, idx) => (
                    <div key={idx} className="booking-card">
                      <div className="booking-time-range">
                        <strong>Time:</strong> {formatDateTime(booking.start_time)} – {formatDateTime(booking.end_time)}
                      </div>
                      {booking.vehicle_number && (
                        <div><strong>Vehicle:</strong> {booking.vehicle_number}</div>
                      )}
                      {booking.booked_by_user_id === userId && (
                        <button
                          className="btn-cancel-small"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={loading}
                        >
                          Cancel This Booking
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {showToast && (
        <div className="toast">
          <p>{toastMessage}</p>
        </div>
      )}
    </div>
  );
};

export default ParkingBooking;
