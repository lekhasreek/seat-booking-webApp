import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './ParkingBooking.css';

const ParkingBooking = ({ userId }) => {
  const navigate = useNavigate();
  
  // State management
  const [twoWheelerSlots, setTwoWheelerSlots] = useState([]);
  const [fourWheelerSlots, setFourWheelerSlots] = useState([]);
  const [currentView, setCurrentView] = useState('two');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    startTime: '',
    vacateTime: ''
  });

  // Show toast notification
  const showNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Fetch parking slots from Supabase
  const fetchParkingSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .order('id');

      if (error) throw error;

      // Separate slots by vehicle type
      const twoWheelers = data.filter(slot => slot.vehicle_type === 'two');
      const fourWheelers = data.filter(slot => slot.vehicle_type === 'four');

      // Convert timestamp strings to Date objects where needed
      const processSlots = (slots) => slots.map(slot => ({
        ...slot,
        start_time: slot.start_time ? new Date(slot.start_time) : null,
        vacate_time: slot.vacate_time ? new Date(slot.vacate_time) : null
      }));

      setTwoWheelerSlots(processSlots(twoWheelers));
      setFourWheelerSlots(processSlots(fourWheelers));
    } catch (error) {
      console.error('Error fetching parking slots:', error);
      showNotification('Error loading parking slots');
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchParkingSlots();

    const channel = supabase
      .channel('parking_slots_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parking_slots' },
        (payload) => {
          const updatedSlot = {
            ...payload.new,
            start_time: payload.new.start_time ? new Date(payload.new.start_time) : null,
            vacate_time: payload.new.vacate_time ? new Date(payload.new.vacate_time) : null
          };

          // Update the appropriate slots array
          if (updatedSlot.vehicle_type === 'two') {
            setTwoWheelerSlots(prev => 
              prev.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot)
            );
          } else {
            setFourWheelerSlots(prev => 
              prev.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle slot click
  const handleSlotClick = (slot) => {
    if (slot.is_booked) {
      setSelectedSlotDetails(slot);
      setShowDetailsModal(true);
    } else {
      setSelectedSlot(slot);
      setShowBookingModal(true);
      // Reset form data
      setFormData({
        vehicleNumber: '',
        startTime: '',
        vacateTime: ''
      });
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
    if (!formData.startTime) {
      showNotification('Start time is required');
      return false;
    }
    if (!formData.vacateTime) {
      showNotification('Vacate time is required');
      return false;
    }
    if (new Date(formData.vacateTime) <= new Date(formData.startTime)) {
      showNotification('Vacate time must be after start time');
      return false;
    }
    return true;
  };

  // Handle booking confirmation
  const handleBookingConfirm = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({
          is_booked: true,
          vehicle_number: formData.vehicleNumber.trim(),
          start_time: formData.startTime,
          vacate_time: formData.vacateTime,
          booked_by_user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSlot.id);

      if (error) throw error;

      showNotification(`Slot ${selectedSlot.id} booked successfully!`);
      setShowBookingModal(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error booking slot:', error);
      showNotification('Error booking slot. Please try again.');
    }
  };

  // Handle slot vacation
  const handleVacateSlot = async () => {
    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({
          is_booked: false,
          vehicle_number: null,
          start_time: null,
          vacate_time: null,
          booked_by_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSlotDetails.id);

      if (error) throw error;

      showNotification(`Slot ${selectedSlotDetails.id} vacated successfully!`);
      setShowDetailsModal(false);
      setSelectedSlotDetails(null);
    } catch (error) {
      console.error('Error vacating slot:', error);
      showNotification('Error vacating slot. Please try again.');
    }
  };

  // Get current slots based on view
  const getCurrentSlots = () => {
    return currentView === 'two' ? twoWheelerSlots : fourWheelerSlots;
  };

  // Format date for display
  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="parking-container">
      <div className="parking-main">
        {/* Header */}
        <header className="parking-header">
          <div className="header-content">
            <div className="header-text">
              <h1 className="parking-title">Parking Dashboard</h1>
              <p className="parking-subtitle">Book your parking slot in real-time.</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="back-button"
            >
              <svg className="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="user-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="user-svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        </header>

        {/* Vehicle Type Selector */}
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

        {/* Parking Grids */}
        <div className="parking-grids">
          <div className={`parking-grid ${currentView === 'two' ? 'two-wheeler-grid' : 'four-wheeler-grid'}`}>
            {getCurrentSlots().map((slot) => (
              <div
                key={slot.id}
                className={`slot ${slot.is_booked ? 'booked' : 'available'}`}
                onClick={() => handleSlotClick(slot)}
              >
                <div className="slot-id">{slot.id}</div>
                <div className="slot-status">
                  {slot.is_booked ? 'Booked' : 'Available'}
                </div>
                {slot.is_booked && slot.vehicle_number && (
                  <div className="slot-vehicle">{slot.vehicle_number}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}></div>
          <div className="modal-content">
            <h3 className="modal-title">Book Slot {selectedSlot?.id}</h3>
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
              <div className="form-group">
                <label htmlFor="startTime" className="form-label">
                  Start Time <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  className="form-input"
                  value={formData.startTime}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="vacateTime" className="form-label">
                  Vacate Time <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="vacateTime"
                  name="vacateTime"
                  className="form-input"
                  value={formData.vacateTime}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Booking
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
            <h3 className="modal-title">Slot Details</h3>
            <div className="slot-details">
              <div className="detail-item">
                <strong>Slot ID:</strong> {selectedSlotDetails.id}
              </div>
              <div className="detail-item">
                <strong>Vehicle Type:</strong> {selectedSlotDetails.vehicle_type === 'two' ? 'Two Wheeler' : 'Four Wheeler'}
              </div>
              <div className="detail-item">
                <strong>Vehicle Number:</strong> {selectedSlotDetails.vehicle_number || 'Not specified'}
              </div>
              <div className="detail-item">
                <strong>Start Time:</strong> {formatDateTime(selectedSlotDetails.start_time)}
              </div>
              <div className="detail-item">
                <strong>Vacate Time:</strong> {formatDateTime(selectedSlotDetails.vacate_time)}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> <span className="status-booked">Occupied</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
              {selectedSlotDetails.booked_by_user_id === userId && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleVacateSlot}
                >
                  Vacate Slot
                </button>
              )}
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
