import React from 'react';

const Header = () => {
    return (
        <div style={{ width: '100%', height: 80, position: 'fixed', top: 0, left: 0, background: '#f7fafd', boxShadow: '0 2px 8px #e0e0e0', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 -10px', overflow: 'hidden' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#22223b' }}>Workspace Booking</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/cprime-logo.png" alt="Cprime" style={{ height: 40, borderRadius: 20, objectFit: 'contain' }} />
                <div style={{ background: '#fff', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#22223b' }}>V</span>
                </div>
            </div>
        </div>
    );
};

export default Header;
