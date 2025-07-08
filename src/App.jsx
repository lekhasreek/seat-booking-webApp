import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FloorLayout from "./components/FloorLayout";
import SectionSeats from "./components/SectionSeats";
import Login from "./components/Login";
import RequireAuth from "./components/RequireAuth";
import Signup from "./components/Signup";
import { Toaster } from 'react-hot-toast';

const App = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [showSignup, setShowSignup] = useState(false);

  // On mount, sync user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored && !user) setUser(JSON.parse(stored));
  }, []);

  // On successful login, set user and redirect to main page
  const handleLogin = (id, email, role) => {
    const userObj = { id, email, role };
    setUser(userObj);
    localStorage.setItem('user', JSON.stringify(userObj));
    // window.location.href = "/"; // let router handle navigation
  };

  // Show signup page
  const handleShowSignup = () => {
    setShowSignup(true);
  };
  // Show login page
  const handleBackToLogin = () => {
    setShowSignup(false);
  };
  // After signup, show login page
  const handleSignupSuccess = () => {
    setShowSignup(false);
  };

  // Optionally, add a logout handler to clear localStorage
  // const handleLogout = () => {
  //   setUser(null);
  //   localStorage.removeItem('user');
  // };

  return (
    <>
      <Toaster position="top-center" />
      <Router>
        <Routes>
          <Route path="/login" element={
            showSignup ? (
              <Signup onBackToLogin={handleBackToLogin} onSignupSuccess={handleSignupSuccess} />
            ) : (
              <Login onLogin={handleLogin} onShowSignup={handleShowSignup} />
            )
          } />
          <Route
            path="/"
            element={
              <RequireAuth isAuthenticated={!!user}>
                <FloorLayout />
              </RequireAuth>
            }
          />
          <Route
            path="/section/:sectionId"
            element={
              <RequireAuth isAuthenticated={!!user}>
                <SectionSeats />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
