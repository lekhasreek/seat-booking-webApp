import React, { useState } from 'react';
import './BookingModal.css';

const BookingModal = ({
  isOpen,
  onClose,
  seatLabel,
  onBook,
  preselectedRange,
}) => {
  // Set default date to today in yyyy-mm-dd format
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const [date] = useState(todayDateStr);
  const [timeslots, setTimeslots] = useState(() =>
    preselectedRange && preselectedRange.length === 2
      ? [{ start: preselectedRange[0], end: preselectedRange[1] }]
      : [{ start: "", end: "" }]
  );
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddTimeslot = () => {
    setTimeslots([...timeslots, { start: "", end: "" }]);
  };

  const handleRemoveTimeslot = idx => {
    setTimeslots(timeslots.filter((_, i) => i !== idx));
  };

  const handleTimeslotChange = (idx, field, value) => {
    const newSlots = [...timeslots];
    newSlots[idx][field] = value;
    setTimeslots(newSlots);
  };

  const handleBook = () => {
    setError("");
    // Validate date is today
    const today = new Date();
    const selected = new Date(date);
    const isToday = selected.getFullYear() === today.getFullYear() &&
      selected.getMonth() === today.getMonth() &&
      selected.getDate() === today.getDate();
    if (!isToday) {
      setError("Bookings allowed for today only.");
      return;
    }
    // Validate timeslots
    for (const ts of timeslots) {
      if (!ts.start || !ts.end) {
        setError("Please select both check-in and check-out times.");
        return;
      }
      if (ts.start >= ts.end) {
        setError("Check-out time must be after check-in time.");
        return;
      }
      if (ts.start < "04:00" || ts.end > "22:00") {
        setError("Bookings allowed only between 4 AM and 10 PM.");
        return;
      }
    }
    const formattedTimeslots = timeslots
      .filter(ts => ts.start && ts.end)
      .map(ts => [ts.start, ts.end]);
    const timeslotJSON = { timeslot: formattedTimeslots };
    onBook({ seatLabel, date, timeslot: timeslotJSON });
    onClose();
  };

  return (
    <div className="booking-modal">
      <div className="booking-modal-title">Book Seat {seatLabel}</div>
      {error && (
        <div style={{ color: 'white', background: '#d9534f', padding: '8px', borderRadius: '4px', marginBottom: '10px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <div className="mb-4">
        <label className="block mb-1">Date:</label>
        <div className="booking-modal-date" style={{ padding: '8px', background: '#f3f3f3', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' }}>
          {todayDateStr.split('-').reverse().join('-')}
        </div>
      </div>
      <div className="mb-4">
        <label className="booking-modal-timeslot-label">Timeslots</label>
        {timeslots.map((ts, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <label>Check-in:</label>
            <input
              type="time"
              value={ts.start}
              onChange={e => handleTimeslotChange(idx, "start", e.target.value)}
              className="border rounded px-2 py-1"
              min="04:00"
              max="22:00"
            />
            <label>Check-out:</label>
            <input
              type="time"
              value={ts.end}
              onChange={e => handleTimeslotChange(idx, "end", e.target.value)}
              className="border rounded px-2 py-1"
              min="04:00"
              max="22:00"
            />
            {idx > 0 && (
              <button
                className="text-red-500 ml-2"
                onClick={() => handleRemoveTimeslot(idx)}
                title="Remove timeslot"
                type="button"
              >
                &minus;
              </button>
            )}
          </div>
        ))}
        <button
          className="bg-blue-500 text-white px-2 py-1 rounded mb-4"
          onClick={handleAddTimeslot}
          type="button"
        >
          +
        </button>
      </div>
      <button
        onClick={handleBook}
        className="booking-modal-book-btn"
        style={{ cursor: 'pointer' }}
      >
        Book
      </button>
      <button
        onClick={onClose}
        className="booking-modal-cancel-btn"
        style={{ cursor: 'pointer' }}
      >
        Cancel
      </button>
    </div>
  );
// ...existing code...
}
export default BookingModal;
