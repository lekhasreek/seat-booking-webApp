import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "./supabaseClient";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import Signup from "./components/Signup";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import ChoicePage from "./components/ChoicePage";
import FloorLayout from "./components/FloorLayout";
import SectionSeats from "./components/SectionSeats";
import ParkingBooking from "./components/ParkingBookingRefactored";
const AppRoutes = () => {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [userId, setUserId] = useState(null); // User_id from Users table
  const [userRole, setUserRole] = useState(null); // Role from Users table
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user info with retry
  const fetchUserInfoWithRetry = async (authUser, retries = 15, delay = 750) => {
    if (!authUser) return { userId: null, userRole: null };
    console.log('DEBUG: authUser.id before Supabase query:', authUser.id, typeof authUser.id);
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('Users')
        .select('User_id, Role')
        .eq('User_id', authUser.id)
        .single();
      if (data && data.User_id) {
        // If no role, default to 'User'
        return { userId: data.User_id, userRole: data.Role || 'User' };
      }
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching user info (attempt ${i + 1}):`, error);
      }
      const currentDelay = delay * (i + 1);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
    // If not found, default to 'User'
    return { userId: null, userRole: 'User' };
  };

  // Handle auth and user setup
  const handleAuthAndUserSetup = async (authUser) => {
    if (!authUser) {
      setUserId(null);
      setUserRole(null);
      return;
    }
    const { userId, userRole } = await fetchUserInfoWithRetry(authUser);
    setUserId(userId);
    setUserRole(userRole);
  };

  // Listen for Supabase authentication state changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      handleAuthAndUserSetup(data?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      handleAuthAndUserSetup(session?.user);
    });
    return () => {
      if (listener?.subscription?.unsubscribe) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  // On login, check user role and navigate to correct dashboard
  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'Admin') {
      if (location.pathname !== '/admin') {
        navigate('/admin', { replace: true });
      }
    } else {
      // Non-admin: allow all valid booking routes
      const validPaths = [
        '/dashboard',
        '/seat-booking',
        '/parking-booking',
      ];
      // Also allow section seat booking
      const isSectionSeats = location.pathname.startsWith('/seat-booking/section/');
      if (!validPaths.includes(location.pathname) && !isSectionSeats) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [userRole, location.pathname, navigate]);

  // Render logic based on user authentication status
  if (!user) {
    return (
      <>
        <ToastContainer position="top-right" />
        {showSignup ? (
          <Signup
            onBackToLogin={() => setShowSignup(false)}
            onSignupSuccess={() => setShowSignup(false)}
          />
        ) : (
          <Login
            onLogin={async () => {
              const { data } = await supabase.auth.getUser();
              setUser(data?.user || null);
              handleAuthAndUserSetup(data?.user);
            }}
            onShowSignup={() => setShowSignup(true)}
          />
        )}
      </>
    );
  }

  // Wait for userRole to be determined before rendering routes
  if (userRole === null) {
    return (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
        <span>Loading...</span>
      </div>
    );
  }

  // If user is authenticated and userRole is set, render the main application routes
  return (
    <>
      <ToastContainer position="top-right" />
      <RealtimeProvider>
        <Routes>
          {userRole === 'Admin' ? (
            <>
              <Route path="/admin" element={<AdminDashboard onBookingsSelect={() => navigate('/dashboard')} />} />
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          ) : (
            <>
              <Route path="/dashboard" element={<ChoicePage />} />
              <Route path="/seat-booking" element={<FloorLayout userId={userId} />} />
              <Route path="/seat-booking/section/:sectionId" element={<SectionSeats userId={userId} />} />
              <Route path="/parking-booking" element={<ParkingBooking userId={userId} />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Only one catch-all redirect for unknown routes */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </RealtimeProvider>
    </>
  );
};

const App = () => (
  <Router>
    <AppRoutes />
  </Router>
);
// (Removed duplicate, misplaced JSX and extra closing tags)
export default App;