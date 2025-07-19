
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
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [selected, setSelected] = useState(new Date());
  const dates = getDates(start, daysToShow);

  const handlePrev = () => {
    const newStart = new Date(start);
    newStart.setDate(start.getDate() - 1);
    setStart(newStart);
  };
  const handleNext = () => {
    const newStart = new Date(start);
    newStart.setDate(start.getDate() + 1);
    setStart(newStart);
  };
  const handleSelect = (date) => {
    setSelected(date);
    onDateChange && onDateChange(date);
  };

  return (
    <div className="calendar-bar">
      <button className="calendar-bar__arrow" onClick={handlePrev}>&lt;</button>
      {dates.map((date, idx) => {
        const isSelected = date.toDateString() === selected.toDateString();
        return (
          <div
            key={idx}
            onClick={() => handleSelect(date)}
            className={`calendar-bar__date${isSelected ? ' calendar-bar__date--selected' : ''}`}
          >
            <div className="calendar-bar__day">{formatDay(date)}</div>
            <div className="calendar-bar__num">{formatDate(date)}</div>
          </div>
        );
      })}
      <button className="calendar-bar__arrow" onClick={handleNext}>&gt;</button>
    </div>
  );
};

export default CalendarBar;
