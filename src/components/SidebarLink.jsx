import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const SidebarLink = ({ to, label, selected }) => {
  const location = useLocation();
  const isActive = selected || location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        color: isActive ? '#fff' : '#22223b',
        background: isActive ? '#3b82f6' : 'transparent',
        fontWeight: isActive ? 600 : 500,
        borderRadius: 8,
        padding: '10px 16px',
        textDecoration: 'none',
        transition: 'background 0.2s, color 0.2s',
        boxShadow: isActive ? '0 2px 8px #e0e0e0' : undefined,
        letterSpacing: 0.2,
        marginBottom: 2,
        display: 'block',
      }}
    >
      {label}
    </Link>
  );
};

export default SidebarLink;
