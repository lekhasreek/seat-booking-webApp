import React from 'react';
import './TimeFilter.css';

/**
 * TimeFilter component
 * - Controlled by selectedRange { checkIn, checkOut }
 * - Center-aligned action buttons
 * - Provides "Now" and "+2h" quick actions
 */
export default function TimeFilter({ selectedRange, onRangeChange, onApply, onClear }) {
  const { checkIn = '', checkOut = '' } = selectedRange || {};

  const isValidRange = Boolean(checkIn && checkOut && checkOut > checkIn);

  const setPreset = (type) => {
    if (type === 'checkin') {
      const d = new Date();
      const m = d.getMinutes();
      const rounded = m % 15 === 0 ? m : m + (15 - (m % 15));
      if (rounded >= 60) { d.setHours(d.getHours() + 1); d.setMinutes(0); } else { d.setMinutes(rounded); }
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      onRangeChange({ ...selectedRange, checkIn: `${hh}:${mm}` });
    } else if (type === 'checkout') {
      if (checkIn) {
        const [h, m] = checkIn.split(':').map(Number);
        let mins = h * 60 + m + 120;
        mins = Math.min(mins, 23 * 60 + 59);
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        onRangeChange({ ...selectedRange, checkOut: `${hh}:${mm}` });
      } else {
        onRangeChange({ ...selectedRange, checkOut: '18:00' });
      }
    }
  };

  return (
    <div className="timefilter-card">
      <div className="timefilter-row">
        <div className="timefilter-group">
          <span className="timefilter-label">Check in</span>
          <input
            className="timefilter-input"
            type="time"
            value={checkIn}
            onChange={(e) => onRangeChange({ ...selectedRange, checkIn: e.target.value })}
            aria-label="Check-in time"
          />
          <button type="button" className="timefilter-micro" onClick={() => setPreset('checkin')}>Now</button>
        </div>
        <div className="timefilter-group">
          <span className="timefilter-label">Check out</span>
          <input
            className="timefilter-input"
            type="time"
            value={checkOut}
            onChange={(e) => onRangeChange({ ...selectedRange, checkOut: e.target.value })}
            aria-label="Check-out time"
          />
          <button type="button" className="timefilter-micro" onClick={() => setPreset('checkout')}>+2h</button>
        </div>
      </div>
      <div className="timefilter-actions">
        <button
          type="button"
          className={`timefilter-primary ${isValidRange ? '' : 'is-disabled'}`}
          onClick={onApply}
          disabled={!isValidRange}
        >
          Check availability
        </button>
        <button type="button" className="timefilter-outline" onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}
