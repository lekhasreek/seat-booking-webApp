
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FloorLayout from "./components/FloorLayout";
import SectionSeats from "./components/SectionSeats";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from "./supabaseClient";


const App = () => {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [userId, setUserId] = useState(null); // User_id from Users table


  // Ensure user exists in Users table, insert if not, then fetch User_id
  const upsertAndFetchUserId = async (authUser) => {
    if (!authUser) return;
    const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
    const email = authUser.email || '';
    // Try to upsert user (insert or update if exists)
    const { error: upsertError } = await supabase.from('Users').upsert([
      {
        User_id: authUser.id,
        Name: name,
        email: email,
        encrypted_password: '' // leave blank, handled by Supabase Auth
      }
    ], { onConflict: ['User_id'] });
    if (upsertError) {
      console.error('Error upserting user:', upsertError);
    }
    // Fetch user row
    const { data, error } = await supabase
      .from('Users')
      .select('User_id')
      .eq('User_id', authUser.id)
      .single();
    if (error) {
      console.error('Error fetching user after upsert:', error);
    }
    if (data && data.User_id) {
      setUserId(data.User_id);
    } else {
      setUserId(null);
    }
  };


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      upsertAndFetchUserId(data?.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      upsertAndFetchUserId(session?.user);
    });
    return () => { listener?.subscription?.unsubscribe && listener.subscription.unsubscribe(); };
  }, []);

  if (!user) {
    return (
      <Router>
        {showSignup ? (
          <Signup
            onBackToLogin={() => setShowSignup(false)}
            onSignupSuccess={() => setShowSignup(false)}
          />
        ) : (
          <Login
            onLogin={() => supabase.auth.getUser().then(({ data }) => {
              setUser(data?.user || null);
              upsertAndFetchUserId(data?.user);
            })}
            onShowSignup={() => setShowSignup(true)}
          />
        )}
      </Router>
    );
  }

  // Example: Fetch bookings for this userId
  // useEffect(() => {
  //   if (userId) {
  //     supabase.from('Bookings').select('*').eq('User_id', userId).then(({ data }) => {
  //       // Do something with bookings
  //     });
  //   }
  // }, [userId]);

  return (
    <>
      <ToastContainer position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<FloorLayout userId={userId} />} />
          <Route path="/section/:sectionId" element={<SectionSeats userId={userId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
