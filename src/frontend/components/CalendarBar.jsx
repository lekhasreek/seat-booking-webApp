
import React, { useState } from 'react';
import './CalendarBar.css';

const getDates = (start, days) => {
  const arr = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d);
  }
  return arr;
};

const formatDay = (date) => date.toLocaleDateString('en-US', { weekday: 'short' });
const formatDate = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const CalendarBar = ({ daysToShow = 7, onDateChange }) => {
  // Only show yesterday, today, and tomorrow
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const dates = [yesterday, today, tomorrow];

  const [selected, setSelected] = useState(today);
  // Tomorrow card is always disabled
  const handleSelect = (date) => {
    setSelected(date);
    onDateChange && onDateChange(date);
  };

  return (
    <div className="calendar-bar">
      {dates.map((date, idx) => {
        const isSelected = date.toDateString() === selected.toDateString();
        let label = '';
        let isDisabled = false;
        let tooltip = '';
        if (idx === 0) label = 'Yesterday';
        else if (idx === 1) label = 'Today';
        else if (idx === 2) {
          label = 'Tomorrow';
          isDisabled = true;
          tooltip = 'Bookings should be made between 4 AM to 10 PM on the current day only.';
        }
        return (
          <div
            key={idx}
            onClick={() => {
              if (!isDisabled) handleSelect(date);
            }}
            className={`calendar-bar__date${isSelected ? ' calendar-bar__date--selected' : ''}${isDisabled ? ' calendar-bar__date--disabled' : ''}`}
            style={isDisabled ? {
              pointerEvents: 'none',
              opacity: 0.5,
              position: 'relative',
              cursor: idx === 2 ? 'not-allowed' : undefined,
            } : {}}
            onMouseEnter={isDisabled ? (e => {
              const tooltipDiv = document.createElement('div');
              tooltipDiv.className = 'calendar-bar__tooltip';
              tooltipDiv.innerText = tooltip;
              tooltipDiv.style.position = 'absolute';
              tooltipDiv.style.top = '-32px';
              tooltipDiv.style.left = '50%';
              tooltipDiv.style.transform = 'translateX(-50%)';
              tooltipDiv.style.background = '#2563eb';
              tooltipDiv.style.color = '#fff';
              tooltipDiv.style.padding = '4px 10px';
              tooltipDiv.style.borderRadius = '6px';
              tooltipDiv.style.fontSize = '13px';
              tooltipDiv.style.zIndex = '100';
              e.currentTarget.appendChild(tooltipDiv);
            }) : undefined}
            onMouseLeave={isDisabled ? (e => {
              const tooltipDiv = e.currentTarget.querySelector('.calendar-bar__tooltip');
              if (tooltipDiv) e.currentTarget.removeChild(tooltipDiv);
            }) : undefined}
          >
            <div className="calendar-bar__label" style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
            <div className="calendar-bar__day">{formatDay(date)}</div>
            <div className="calendar-bar__num">{formatDate(date)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarBar;
