import React from 'react';
import './Popover.css';

const Popover = ({
  x,
  y,
  details,
}) => {
  if (!details) return null;
  return (
    <div
      className="popover"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="popover-title">Booked by: {details.name}</div>
      <ul className="popover-list">
        {details.timeSlotsStatus.map(slotStatus => (
          <li key={slotStatus.slot} className="popover-list-item">
            <span className="popover-slot">{slotStatus.slot}</span>
            <span
              className={`popover-status ${slotStatus.isBooked ? 'booked' : 'available'}`}
            >
              {slotStatus.isBooked ? `Booked (${slotStatus.bookedBy || 'N/A'})` : 'Available'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};



export default Popover;
