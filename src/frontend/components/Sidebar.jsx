import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import MenuBurgerIcon from '../../assets/menu-burger-horizontal-svgrepo-com.svg';
// import FloorMap from '../../assets/FloorMap.svg';

const SECTIONS = [
  { id: 'A', label: 'Section A' },
  { id: 'B', label: 'Section B' },
  { id: 'C', label: 'Section C' },
  { id: 'D', label: 'Section D' },
  { id: 'E', label: 'Section E' },
  { id: 'F', label: 'Section F' },
  { id: 'G', label: 'Section G' },
];

const Sidebar = ({ currentSection, onSectionSelect, isOpen, onClose }) => {
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  // Responsive: track window width
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on outside click (only if open and on mobile)
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, onClose]);

  return (
    <>
      {(!isOpen || isMobile) && (
        <button className="sidebar-burger" onClick={onClose} aria-label="Open sidebar">
          <img src={MenuBurgerIcon} alt="Menu" className="sidebar-burger-icon" />
        </button>
      )}
      <aside
        className="sidebar-container"
        ref={sidebarRef}
        style={{
          display: isOpen ? 'block' : 'none',
          ...(isMobile
            ? {
                position: 'fixed',
                left: 0,
                top: 0,
                height: '100vh',
                zIndex: 3001,
                background: '#fff',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                width: '90vw',
                maxWidth: 420,
                minWidth: 220,
                transition: 'transform 0.2s cubic-bezier(.4,0,.2,1)',
              }
            : { boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)' })
        }}
      >
        <div className="sidebar-header" style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 0}}>
          <div className="sidebar-header-title">Workplace Booking</div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">&times;</button>
        </div>
        <ul className="sidebar-section-list">
          {SECTIONS.map(section => (
            <li
              key={section.id}
              className={`sidebar-section-item${currentSection === section.id ? ' selected' : ''}`}
              onClick={() => onSectionSelect(section.id)}
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSectionSelect(section.id)}
            >
              {section.label}
            </li>
          ))}
        </ul>
        {/* Map view link at the bottom */}
        <div
          className="sidebar-map-link"
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '18px 24px 12px 24px',
            fontWeight: 600,
            color: '#2563eb',
            fontSize: 17,
            borderTop: '1px solid #e5e7eb',
            marginTop: 'auto',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: 22, display: 'flex', alignItems: 'center' }}>{'<-'}</span>
          <span>Map view</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
