import React, { useState, useEffect } from 'react';
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

  // Reinitialize times when the modal opens or when preselectedRange changes
  useEffect(() => {
    if (!isOpen) return;
    if (preselectedRange && preselectedRange.length === 2) {
      setTimeslots([{ start: preselectedRange[0], end: preselectedRange[1] }]);
    } else {
      setTimeslots([{ start: "", end: "" }]);
    }
  }, [isOpen, preselectedRange]);

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
      // Removed 4AM-10PM restriction
    }
    const formattedTimeslots = timeslots
      .filter(ts => ts.start && ts.end)
      .map(ts => [ts.start, ts.end]);
    const timeslotJSON = { timeslot: formattedTimeslots };
    onBook({ seatLabel, date, timeslot: timeslotJSON });
    onClose();
  };

  return (
    <div className="booking-modal" style={{
      maxWidth: 400,
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f0f4ff 60%, #e0e7ff 100%)',
      borderRadius: 14,
      boxShadow: '0 4px 16px 0 #2563eb18',
      padding: '32px 28px 24px 28px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      border: '1.5px solid #2563eb33',
      gap: 0,
    }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, letterSpacing: 0.2, color: '#2563eb' }}>Book Seat {seatLabel}</div>
      {error && (
        <div style={{ color: 'white', background: '#e11d48', padding: '10px 16px', borderRadius: '6px', marginBottom: '18px', textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, width: '100%', justifyContent: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: 16, color: '#444', marginRight: 8 }}>Date:</label>
        <div style={{ padding: '8px 18px', background: '#f3f3f3', borderRadius: '6px', fontWeight: 'bold', textAlign: 'center', fontSize: 16, minWidth: 120, color: '#2563eb', letterSpacing: 1 }}>
          {todayDateStr.split('-').reverse().join('-')}
        </div>
      </div>
      <div style={{ width: '100%', marginBottom: 18 }}>
        <label style={{ fontWeight: 600, fontSize: 16, color: '#444', marginBottom: 8, display: 'block' }}>Timeslots</label>
        {timeslots.map((ts, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, width: '100%' }}>
            <label style={{ fontWeight: 500, color: '#2563eb', fontSize: 15 }}>Check-in:</label>
            <input
              type="time"
              value={ts.start}
              onChange={e => handleTimeslotChange(idx, "start", e.target.value)}
              style={{ border: '1.5px solid #2563eb', borderRadius: 6, padding: '6px 10px', fontSize: 15, width: 90 }}
            />
            <label style={{ fontWeight: 500, color: '#2563eb', fontSize: 15 }}>Check-out:</label>
            <input
              type="time"
              value={ts.end}
              onChange={e => handleTimeslotChange(idx, "end", e.target.value)}
              style={{ border: '1.5px solid #2563eb', borderRadius: 6, padding: '6px 10px', fontSize: 15, width: 90 }}
            />
            {idx > 0 && (
              <button
                style={{ color: '#e11d48', background: 'none', border: 'none', fontSize: 22, marginLeft: 6, cursor: 'pointer', fontWeight: 700 }}
                onClick={() => handleRemoveTimeslot(idx)}
                title="Remove timeslot"
                type="button"
              >
                &minus;
              </button>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', marginTop: '2px' }}>
          <button
            style={{ background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 18, borderRadius: 8, padding: '4px 18px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px #2563eb22' }}
            onClick={handleAddTimeslot}
            type="button"
          >
            +
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, width: '100%', justifyContent: 'center', marginTop: 10 }}>
        <button
          onClick={handleBook}
          style={{ background: '#059669', color: '#fff', fontWeight: 700, fontSize: 17, borderRadius: 8, padding: '10px 32px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px #05966922', letterSpacing: 0.5 }}
        >
          Book
        </button>
        <button
          onClick={onClose}
          style={{ background: '#e11d48', color: '#fff', fontWeight: 700, fontSize: 17, borderRadius: 8, padding: '10px 32px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px #e11d4822', letterSpacing: 0.5 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
// ...existing code...
}
export default BookingModal;
