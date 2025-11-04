// Header.jsx
import React from 'react';
import './Header.css';
import { useNavigate } from 'react-router-dom';

import cprimeLogo from '/cprime-logo.png';
import UserPopover from './UserPopover';
import UserBookingsModal from './UserBookingsModal';
import { getBookingsByUser } from '../services/bookingService';
import { useState, useEffect } from 'react';

const Header = () => {
    const [showBookingsModal, setShowBookingsModal] = useState(false);
    const [userBookings, setUserBookings] = useState([]);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        async function fetchUserId() {
            const { data: { user } } = await import('../supabaseClient').then(m => m.supabase.auth.getUser());
            if (user) setUserId(user.id);
        }
        fetchUserId();
    }, []);

    useEffect(() => {
        if (showBookingsModal && userId) {
            getBookingsByUser(userId)
                .then(result => setUserBookings(result.bookings || []))
                .catch(() => setUserBookings([]));
        }
    }, [showBookingsModal, userId]);

    const navigate = useNavigate();
    return (
        <div className="header-container">
            {/* Left: (removed Back to dashboard button as requested) */}
            
            {/* Center: Title */}
            <div className="header-title"><h1 className="welcome-title">Welcome to <span className="brand-reserve">R</span>eserve<span className="brand-now">N</span>ow</h1></div>
            
            {/* Right: Logo + Avatar in white box */}
            <div className="header-right-box">
                <img src={cprimeLogo} alt="Cprime Logo" className="cprime-logo-in-header" />
                <UserPopover onOpenBookingsModal={() => setShowBookingsModal(true)} showBookingsBtn={true} />
            </div>
            
            {/* Bookings Modal */}
            <div style={{ position: 'absolute', left: 24, top: 80, zIndex: 9999 }}>
                <UserBookingsModal
                    isOpen={showBookingsModal}
                    onClose={() => setShowBookingsModal(false)}
                    bookings={userBookings}
                />
            </div>
        </div>
    );
};

export default Header;