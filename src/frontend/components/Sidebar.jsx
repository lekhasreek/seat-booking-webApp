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

const Sidebar = ({ currentSection, onSectionSelect, isOpen: controlledOpen, onClose }) => {
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  // Allow controlled or uncontrolled usage
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const toggleOpen = () => {
    if (isControlled) {
      // If controlled, call onClose as a toggle fallback
      onClose && onClose();
    } else {
      setUncontrolledOpen(v => !v);
    }
  };

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
        if (isControlled) {
          onClose && onClose();
        } else {
          setUncontrolledOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, isControlled, onClose]);

  return (
    <>
      <button className="sidebar-burger" onClick={toggleOpen} aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}>
        <img src={MenuBurgerIcon} alt="Menu" className="sidebar-burger-icon" />
      </button>
      <aside
        className={`sidebar-container ${isOpen ? 'open' : ''}`}
        ref={sidebarRef}
      >
        <div className="sidebar-header sidebar-header-row">
          <div className="sidebar-header-title">Workplace Booking</div>
          <button className="sidebar-close-btn" onClick={toggleOpen} aria-label="Close sidebar">&times;</button>
        </div>
        <ul className="sidebar-section-list">
          {SECTIONS.map(section => (
            <li
              key={section.id}
              className={`sidebar-section-item${currentSection === section.id ? ' selected' : ''}`}
              onClick={() => {
                onSectionSelect ? onSectionSelect(section.id) : navigate(`/section/${section.id}`);
                if (isMobile) toggleOpen();
              }}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSectionSelect ? onSectionSelect(section.id) : navigate(`/section/${section.id}`);
                  if (isMobile) toggleOpen();
                }
              }}
            >
              {section.label}
            </li>
          ))}
        </ul>
        {/* Map view link at the bottom */}
        <div className="sidebar-map-link" onClick={() => { navigate('/'); if (isMobile) toggleOpen(); }}>
          <span className="sidebar-map-arrow">&larr;</span>
          <span>Map view</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
