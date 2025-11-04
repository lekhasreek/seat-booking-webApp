import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChoicePage.css';

const ChoicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="choice-page-container">
      <div className="choice-page-content">
        {/* Header */}
        <div className="choice-page-header">
          <h1 className="welcome-title">Welcome to ReserveNow</h1>
          <p className="choice-page-subtitle">Choose what you'd like to book today</p>
        </div>

        {/* Choice Cards */}
        <div className="choice-cards-container">
          {/* Office Seat Booking Card */}
          <div 
            className="choice-card"
            onClick={() => { console.log('Navigating to /seat-booking'); navigate('/seat-booking'); }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                console.log('Navigating to /seat-booking via keyboard');
                navigate('/seat-booking');
              }
            }}
          >
            <div className="card-content">
              <div className="card-icon-container">
                <div className="card-icon-wrapper office-seat-icon">
                  <svg 
                    className="card-icon" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                    />
                  </svg>
                </div>
              </div>
              <h3 className="card-title">Book an Office Seat</h3>
              <div className="card-cta office-seat-cta">
                <span>Get Started</span>
                <svg className="cta-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Parking Slot Booking Card */}
          <div 
            className="choice-card"
            onClick={() => { console.log('Navigating to /parking-booking'); navigate('/parking-booking'); }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                console.log('Navigating to /parking-booking via keyboard');
                navigate('/parking-booking');
              }
            }}
          >
            <div className="card-content">
              <div className="card-icon-container">
                <div className="card-icon-wrapper parking-slot-icon">
                  <svg 
                    className="card-icon" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" 
                    />
                  </svg>
                </div>
              </div>
              <h3 className="card-title">Book a Parking Slot</h3>
              <div className="card-cta parking-slot-cta">
                <span>Get Started</span>
                <svg className="cta-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="choice-page-footer">
        </div>
      </div>

      {/* Small Cprime Logo - Bottom Right */}
      <div className="cprime-logo">
        <span className="c-text">c</span><span className="prime-text">prime</span>
      </div>
    </div>
  );
};

export default ChoicePage;
