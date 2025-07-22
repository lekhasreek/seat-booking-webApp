// LogoutButton.jsx
import React, { useState } from 'react';
// import axios from 'axios'; // No longer needed
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient'; // Import your Supabase client
import './LogoutButton.css';

function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoading(true); // Set loading to true immediately

    try {
      // Call Supabase's signOut method
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error; // Propagate error to the catch block
      }

      // On successful logout:
      toast.success('Logged out successfully!', { position: 'top-right', autoClose: 1500 });

      // Add a small delay to allow "Logging out..." to be seen
      setTimeout(() => {
        navigate('/login'); // Redirect to the login page after a short delay
      }, 1500); // 1.5 second delay

    } catch (error) {
      console.error('Logout failed:', error.message); // Supabase errors have a 'message' property
      toast.error(`Logout failed: ${error.message || 'Please try again.'}`, { position: 'top-right', autoClose: 3000 });
      setLoading(false); // Reset loading state if logout fails
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="logout-btn"
      disabled={loading}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="22" height="22" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        {loading ? 'Logging out...' : 'Logout'}
      </span>
    </button>
  );
}

export default LogoutButton;