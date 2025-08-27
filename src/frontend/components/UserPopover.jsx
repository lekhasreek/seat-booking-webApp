// UserPopover.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Corrected path
import userAvatar from '/user-blue.png';
import LogoutButton from './LogoutButton';
import UserBookingsModal from './UserBookingsModal';
import { getBookingsByUser } from '../services/bookingService';
import { FaCalendarAlt } from 'react-icons/fa';

const UserPopover = ({ onOpenBookingsModal }) => {
    const [showPopover, setShowPopover] = useState(false);
    const [userName, setUserName] = useState('User');
    // Modal state and bookings logic removed; handled by parent
    // const [showBookingsModal, setShowBookingsModal] = useState(false);
    // const [userBookings, setUserBookings] = useState([]);
    // const [userId, setUserId] = useState(null);
    const popoverRef = useRef(null);
    const avatarRef = useRef(null);

    // Function to parse name from email
    const getNameFromEmail = (email) => {
        if (!email) return 'User';
        const parts = email.split('@')[0].split('.');
        const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
        const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
        return `${firstName} ${lastName}`.trim();
    };

    // Fetch user details from Supabase
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                if (user) {
                    const { data: userData, error: userDataError } = await supabase
                        .from('Users') // Replace 'Users' with your actual table name if different
                        .select('Name, Email')
                        .eq('User_id', user.id)
                        .single();

                    if (userDataError && userDataError.code !== 'PGRST116') {
                        console.warn("User data not found in 'Users' table, falling back to auth email:", userDataError);
                        setUserName(getNameFromEmail(user.email));
                    } else if (userData && userData.Name) {
                        setUserName(userData.Name);
                    } else {
                        setUserName(getNameFromEmail(user.email));
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error.message);
                setUserName('User');
            }
        };

        fetchUserData();

        // CORRECTED LINE: Destructure `subscription` from `data`
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                fetchUserData();
            } else if (event === 'SIGNED_OUT') {
                setUserName('User');
                setShowPopover(false);
            }
        });

        return () => {
            // Call unsubscribe on the subscription object
            subscription?.unsubscribe();
        };
    }, []); // Dependency array for useEffect

    // Booking modal logic removed; handled by parent

    // Handle click outside to close popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target) &&
                avatarRef.current && !avatarRef.current.contains(event.target)) {
                setShowPopover(false);
            }
        };

        if (showPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPopover]);

    return (
        <>
            <img
                src={userAvatar}
                alt="User Avatar"
                className="user-avatar-image"
                onClick={() => setShowPopover(!showPopover)}
                ref={avatarRef}
                onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
            />

            {showPopover && (
                <div ref={popoverRef} className="user-popover">
                    <div className="popover-managed-by">Managed by cprime.com</div>
                    <div className="popover-user-icon">
                        <img src={userAvatar} alt="User" className="popover-user-avatar-img" />
                    </div>
                    <div className="popover-greeting">Hi, {userName}!</div>
                    <button
                        className="user-bookings-btn"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, margin: '12px auto 0 auto', padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 500
                        }}
                        onClick={onOpenBookingsModal}
                    >
                        <FaCalendarAlt style={{ marginRight: 6 }} /> My Bookings
                    </button>
                    <div style={{ marginTop: 12 }}>
                        <LogoutButton />
                    </div>
                </div>
            )}
            {/* Modal is now managed and rendered by parent (Header) */}
        </>
    );
};

export default UserPopover;