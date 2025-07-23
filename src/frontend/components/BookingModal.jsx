import React from 'react';
import './BookingModal.css';
const BookingModal = ({
  isOpen,
  onClose,
  seatLabel,
  selectedDate,
  selectedTimeSlots,
  onTimeSlotChange,
  onBook,
  isBookDisabled,
  isAlreadyBooked,
  bookedSeatsMap,
      onEdit,
      onDelete,
}) => {
  if (!isOpen) return null;
  return (
    <div className="booking-modal">
      <div className="booking-modal-title">Book Seat {seatLabel}</div>
      <input
        type="date"
        value={selectedDate}
        readOnly
        className="booking-modal-date"
      />
      <div style={{ width: '100%', marginBottom: 12 }}>
        <label className="booking-modal-timeslot-label">Time Slot</label>
        <div className="booking-modal-timeslot-list">
          {['morning', 'afternoon', 'evening'].map(slot => {
            const isBooked = !!(bookedSeatsMap?.[selectedDate]?.[seatLabel]?.[slot]);
            return (
              <label
                key={slot}
                className="booking-modal-timeslot"
                style={{ opacity: isBooked ? 0.5 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={selectedTimeSlots.includes(slot)}
                  disabled={isBooked}
                  onChange={e => onTimeSlotChange(slot, e.target.checked, isBooked)}
                />
                <span style={{ textTransform: 'capitalize' }}>{slot}</span>
              </label>
            );
          })}
        </div>
      </div>
      <button
        onClick={onBook}
        className="booking-modal-book-btn"
        style={{
          cursor: isBookDisabled ? 'not-allowed' : 'pointer',
          opacity: isBookDisabled ? 0.6 : 1,
        }}
        disabled={isBookDisabled}
      >
        {isAlreadyBooked ? 'Already Booked' : 'Book'}
      </button>
          {/* Show Edit/Delete only if seat is already booked */}
          {isAlreadyBooked && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => typeof onEdit === 'function' && onEdit()}
                className="booking-modal-edit-btn"
                style={{ background: '#f0ad4e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button
                onClick={() => typeof onDelete === 'function' && onDelete()}
                className="booking-modal-delete-btn"
                style={{ background: '#d9534f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          )}
      <button
        onClick={onClose}
        className="booking-modal-cancel-btn"
        style={{ cursor: 'pointer' }}
      >
        Cancel
      </button>
    </div>
  );
};



export default BookingModal;
