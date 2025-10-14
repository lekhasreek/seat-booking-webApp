import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './ParkingBooking.css';
import { useNavigate } from 'react-router-dom';
import userAvatar from '/user-blue.png';
import cprimeLogo from '/cprime-logo.png';
import UserPopover from './UserPopover';

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

  const resolveSlotLabel = (slot) => {
    if (!slot) return '';
    return String(slot.display_label ?? slot.slot_code ?? slot.code ?? slot.name ?? slot.id ?? '');
  };

  const getSlotOrderIndex = (slot) => {
    const label = resolveSlotLabel(slot);
    const match = label.match(/\d+/);
    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sortSlots = (slots) => {
    return [...slots].sort((a, b) => {
      const orderDiff = getSlotOrderIndex(a) - getSlotOrderIndex(b);
      if (orderDiff !== 0) {
        return orderDiff;
      }

      const labelA = resolveSlotLabel(a);
      const labelB = resolveSlotLabel(b);
      return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
    });
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

      setTwoWheelerSlots(sortSlots(processSlots(twoWheelers)));
      setFourWheelerSlots(sortSlots(processSlots(fourWheelers)));
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
            setTwoWheelerSlots(prev => {
              const updated = prev.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot);
              return sortSlots(updated);
            });
          } else {
            setFourWheelerSlots(prev => {
              const updated = prev.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot);
              return sortSlots(updated);
            });
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
  fetchParkingSlots();
    } catch (error) {
      console.error('Error vacating slot:', error);
      showNotification('Error vacating slot. Please try again.');
    }
  };

  // Handle booking confirm
  const handleBookingConfirm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({
          is_booked: true,
          vehicle_number: formData.vehicleNumber,
          start_time: formData.startTime,
          vacate_time: formData.vacateTime,
          booked_by_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSlot.id);
      if (error) throw error;
  showNotification(`Slot ${selectedSlot.id} booked successfully!`);
  setShowBookingModal(false);
  setSelectedSlot(null);
  fetchParkingSlots();
    } catch (error) {
      console.error('Error booking slot:', error);
      showNotification('Error booking slot. Please try again.');
    }
  };

  // Get current slots based on view
  const sortedTwoWheelerSlots = useMemo(() => sortSlots(twoWheelerSlots), [twoWheelerSlots]);
  const sortedFourWheelerSlots = useMemo(() => sortSlots(fourWheelerSlots), [fourWheelerSlots]);

  const getCurrentSlots = () => {
    return currentView === 'two' ? sortedTwoWheelerSlots : sortedFourWheelerSlots;
  };

  // Format date for display
  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString();
  };

  const currentSectionTitle = currentView === 'two' ? 'Two Wheeler Parking' : 'Four Wheeler Parking';
  const totalSlots = currentView === 'two' ? twoWheelerSlots.length : fourWheelerSlots.length;

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
            <p className="parking-subtitle">Simple &amp; Quick Parking Slot Booking</p>
          </div>
        </header>

        <div className="content-container">
          <div className="section-header">
            <h2 className="section-title">{currentSectionTitle}</h2>
            <p className="section-subtitle">Total Slots: {totalSlots}</p>
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
          <div className="parking-grids-container">
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


