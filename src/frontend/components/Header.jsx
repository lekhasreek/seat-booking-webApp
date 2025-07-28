// Header.jsx
import React from 'react';
import './Header.css';

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

    return (
        <div className="header-container">
            <div className="header-title">Workspace Booking</div>
            <div className="header-right-box">
                {/* Cprime Logo */}
                <img src={cprimeLogo} alt="Cprime Logo" className="cprime-logo-in-header" />

                {/* User Avatar and Popover Component */}
                <UserPopover onOpenBookingsModal={() => setShowBookingsModal(true)} />
            </div>
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