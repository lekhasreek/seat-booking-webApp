
import React from 'react';
import './Header.css';

const Header = () => {
    return (
        <div className="header-container">
            <div className="header-title">Workspace Booking</div>
            <div className="header-right">
                <img src="/cprime-logo.png" alt="Cprime" className="header-logo" />
                <div className="header-avatar">
                    <span className="header-avatar-text">V</span>
                </div>
            </div>
        </div>
    );
};

export default Header;
