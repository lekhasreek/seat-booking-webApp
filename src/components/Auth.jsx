import React, { useState } from 'react';
import { supabase } from '../supabaseClient';


export default function Auth({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // or 'signup'

  // Remove Supabase auth info from local storage
  const clearLocalStorageAuth = () => {
    // Remove all Supabase auth keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let result;
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      clearLocalStorageAuth();
    } else {
      onAuth && onAuth();
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: '40px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 10, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600 }}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        {mode === 'login' ? (
          <span>Don't have an account? <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setMode('signup'); clearLocalStorageAuth(); }}>Sign Up</button></span>
        ) : (
          <span>Already have an account? <button style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setMode('login'); clearLocalStorageAuth(); }}>Login</button></span>
        )}
      </div>
    </div>
  );
}
