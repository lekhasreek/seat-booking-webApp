import React, { useState } from 'react';

const getDates = (start: Date, days: number) => {
  const arr = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d);
  }
  return arr;
};

const formatDay = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const CalendarBar: React.FC<{
  daysToShow?: number;
  onDateChange?: (date: Date) => void;
}> = ({ daysToShow = 7, onDateChange }) => {
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
  const handleSelect = (date: Date) => {
    setSelected(date);
    onDateChange && onDateChange(date);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '32px 0 24px 0', justifyContent: 'center' }}>
      <button onClick={handlePrev} style={{ border: 'none', background: 'none', fontSize: 24, color: '#bbb', cursor: 'pointer', borderRadius: 8, width: 40, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lt;</button>
      {dates.map((date, idx) => {
        const isSelected = date.toDateString() === selected.toDateString();
        return (
          <div
            key={idx}
            onClick={() => handleSelect(date)}
            style={{
              minWidth: 80,
              padding: '8px 0',
              background: isSelected ? '#eaf1ff' : '#fff',
              borderRadius: 12,
              border: isSelected ? '2px solid #2563eb' : '1px solid #eee',
              color: isSelected ? '#2563eb' : '#22223b',
              fontWeight: isSelected ? 700 : 500,
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: isSelected ? '0 2px 8px #e0e0e0' : undefined,
              margin: '0 4px',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{ fontSize: 14 }}>{formatDay(date)}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{formatDate(date)}</div>
          </div>
        );
      })}
      <button onClick={handleNext} style={{ border: 'none', background: 'none', fontSize: 24, color: '#bbb', cursor: 'pointer', borderRadius: 8, width: 40, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&gt;</button>
    </div>
  );
};

export default CalendarBar;
