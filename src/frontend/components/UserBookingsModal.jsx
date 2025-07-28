import React, { useState } from 'react';
import './UserBookingsModal.css';

const TABS = [
  { label: 'Present', key: 'present' },
  { label: 'Past', key: 'past' },
];


// Helper to extract and normalize the booking date
function getBookingDate(booking) {
  // Try all possible date fields
  const raw = booking.date || booking.Date || booking.created_at;
  if (!raw) return null;
  // If ISO string, take only the date part
  if (typeof raw === 'string' && raw.includes('T')) return raw.split('T')[0];
  return raw;
}

function isPast(booking) {
  const dateStr = getBookingDate(booking);
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  return d < today;
}

function isPresent(booking) {
  const dateStr = getBookingDate(booking);
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  return d >= today;
}

const UserBookingsModal = ({ isOpen, onClose, bookings }) => {
  const [activeTab, setActiveTab] = useState('present');
  if (!isOpen) return null;

  const presentBookings = bookings.filter(isPresent);
  const pastBookings = bookings.filter(isPast);
  const tabBookings = activeTab === 'present' ? presentBookings : pastBookings;

  // Handler for overlay click
  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay, not inside the modal
    if (e.target.classList.contains('user-bookings-modal-overlay')) {
      onClose();
    }
  };

  return (
    <div
      className="user-bookings-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.18)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'none',
      }}
      onClick={handleOverlayClick}
    >
      <form
        className="user-bookings-modal"
        style={{
          minWidth: 900,
          maxWidth: 1200,
          minHeight: 600,
          maxHeight: '80vh',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px #0002',
          padding: 0,
          border: '1px solid #eee',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()} // Prevent overlay click from closing when clicking inside modal
      >
        <div className="user-bookings-modal-header" style={{ borderBottom: '1px solid #eee', padding: '18px 24px 10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>My Bookings</h2>
          <button type="button" className="close-btn" onClick={onClose} style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>
        <div className="user-bookings-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '18px 0 10px 0' }}>
          {TABS.map(tab => (
            <button
              type="button"
              key={tab.key}
              className={`user-bookings-tab${activeTab === tab.key ? ' active' : ''}`}
              style={{
                padding: '7px 22px',
                borderRadius: 6,
                border: '1px solid #2563eb',
                background: activeTab === tab.key ? '#2563eb' : '#fff',
                color: activeTab === tab.key ? '#fff' : '#2563eb',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                fontSize: 15
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="user-bookings-list" style={{
          padding: '0 24px 24px 24px',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}>
          {tabBookings.length === 0 ? (
            <div className="no-bookings" style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>No bookings found.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              overflow: 'visible',
            }}>
              {tabBookings.map((booking, idx) => (
                <div
                  className="booking-card"
                  key={idx}
                  style={{
                    border: '1.5px solid #2563eb33',
                    borderRadius: 14,
                    padding: 18,
                    background: 'linear-gradient(135deg, #f0f4ff 60%, #e0e7ff 100%)',
                    boxShadow: '0 4px 16px 0 #2563eb18',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    cursor: 'pointer',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: 6,
                    zIndex: 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 8px 24px 0 #2563eb22';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 4px 16px 0 #2563eb18';
                  }}
                >
                  <div className="booking-card-row" style={{ fontWeight: 700, fontSize: 17, color: '#2563eb', marginBottom: 2 }}>
                    Section: {
                      booking.section || booking.workspace || (() => {
                        const seatNum = booking.seat_number || booking.seatNumber || booking.Seat_Number || '';
                        return seatNum ? seatNum[0] : '-';
                      })()
                    }
                  </div>
                  <div className="booking-card-row" style={{ fontWeight: 600, fontSize: 16, color: '#222' }}>
                    Seat Number: <span style={{ color: '#2563eb', fontWeight: 700 }}>{booking.seat_number || booking.seatNumber || booking.Seat_Number || '-'}</span>
                  </div>
                  <div className="booking-card-row" style={{ fontSize: 15, color: '#444' }}>
                    Date: <span style={{ color: '#111', fontWeight: 500 }}>{getBookingDate(booking) || '-'}</span>
                  </div>
                  <div className="booking-card-row" style={{ fontSize: 15, color: '#444' }}>
                    Time Slot: <span style={{ color: '#059669', fontWeight: 600, textTransform: 'capitalize' }}>{booking.time_slot || booking.timeSlot || booking.Timeslot || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserBookingsModal;
