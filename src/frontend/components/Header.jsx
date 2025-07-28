// Header.jsx
import React from 'react';
import './Header.css';

import cprimeLogo from '/cprime-logo.png';
import UserPopover from './UserPopover'; // Import the UserPopover component
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const Header = () => {
    return (
        <div className="header-container">
            <div className="header-title">Workspace Booking</div>
            <div className="header-right-box">
                {/* Cprime Logo */}
                <img src={cprimeLogo} alt="Cprime Logo" className="cprime-logo-in-header" />

                {/* User Avatar and Popover Component */}
                <UserPopover />
            </div>
        </div>
    );
};

export default Header;