import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FloorLayout from "./components/FloorLayout";
import SectionSeats from "./components/SectionSeats";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "./supabaseClient";
// Removed: import { upsertUser } from "../../backend/users"; // No longer needed as DB trigger handles user creation

// Expose toast globally for debug button
if (typeof window !== 'undefined') {
  window.toast = toast;
}

const App = () => {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [userId, setUserId] = useState(null); // User_id from Users table

  /**
   * Fetches the User_id from the public.Users table with a retry mechanism.
   * This is necessary because the database trigger that populates the Users table
   * might have a slight delay after a new user is created in auth.users.
   * @param {object} authUser - The authenticated user object from Supabase (session.user).
   * @param {number} retries - Maximum number of retry attempts.
   * @param {number} delay - Initial delay in milliseconds before the first retry.
   * @returns {string|null} The fetched User_id or null if not found after retries.
   */
  const fetchUserIdWithRetry = async (authUser, retries = 15, delay = 750) => {
    if (!authUser) return null;

    for (let i = 0; i < retries; i++) {
      console.log(`Attempting to fetch User_id for authUser.id: ${authUser.id} (Attempt ${i + 1}/${retries})`);
      const { data, error } = await supabase
        .from('Users')
        .select('User_id')
        .eq('User_id', authUser.id)
        .single();

      if (data && data.User_id) {
        console.log(`User_id fetched successfully on attempt ${i + 1}:`, data.User_id);
        return data.User_id; // Found the user ID
      }

      // PGRST116 means 'No rows found', which is expected during retries if the row isn't there yet
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching user ID (attempt ${i + 1}):`, error);
        // For unexpected errors, you might want to stop retrying or show a specific toast
      }

      const currentDelay = delay * (i + 1); // Exponential backoff
      console.log(`User_id not found on attempt ${i + 1}. Retrying in ${currentDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
    console.error('Failed to fetch User_id after multiple retries.');
    return null; // Could not fetch after all retries
  };

  /**
   * Handles authentication state changes and sets up the user ID.
   * This function is called on initial load and whenever auth state changes.
   * @param {object|null} authUser - The authenticated user object or null.
   */
  const handleAuthAndUserSetup = async (authUser) => {
    if (!authUser) {
      setUserId(null);
      return;
    }
    // Relying on the database trigger to populate the 'Users' table.
    // No client-side upsertUser call is needed here.
    const fetchedUserId = await fetchUserIdWithRetry(authUser);
    setUserId(fetchedUserId);
  };

  // Effect hook to listen for Supabase authentication state changes
  useEffect(() => {
    // Initial check for the user session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      handleAuthAndUserSetup(data?.user);
    });

    // Set up a listener for real-time auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      handleAuthAndUserSetup(session?.user);
    });

    // Clean up the listener when the component unmounts
    return () => {
      if (listener?.subscription?.unsubscribe) {
        listener.subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Render logic based on user authentication status
  if (!user) {
    return (
      <>
        <ToastContainer position="top-right" />
        <Router>
          {showSignup ? (
            <Signup
              onBackToLogin={() => setShowSignup(false)}
              onSignupSuccess={() => setShowSignup(false)}
            />
          ) : (
            <Login
              onLogin={async () => {
                // After login, manually trigger user data fetch and setup
                const { data } = await supabase.auth.getUser();
                setUser(data?.user || null);
                handleAuthAndUserSetup(data?.user);
              }}
              onShowSignup={() => setShowSignup(true)}
            />
          )}
        </Router>
      </>
    );
  }

  // If user is authenticated, render the main application routes
  return (
    <>
      <ToastContainer position="top-right" />
      <Router>
        <Routes>
          {/* Pass the userId prop to FloorLayout and SectionSeats */}
          <Route path="/" element={<FloorLayout userId={userId} />} />
          <Route path="/section/:sectionId" element={<SectionSeats userId={userId} />} />
          {/* Redirect any unmatched routes to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;