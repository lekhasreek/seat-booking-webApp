
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
const cprimeLogoSrc = '/cprime-logo.png';
import './Login.css';

const Login = ({ onLogin, onShowSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data && data.user) {
      onLogin(data.user.id, data.user.email, 'user');
      navigate('/');
    } else {
      setError('Login failed.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img src={cprimeLogoSrc} alt="Cprime" className="login-logo" />
        <h2>Welcome Back</h2>
        <p>Login to access your account</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>Email or Username</label>
          <input
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ paddingRight: '2.5em' }}
            />
            <button
              type="button"
              className="link-button"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '18px', padding: 0, background: 'none', border: 'none' }}
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </form>

      <div className="login-footer" style={{ textAlign: 'center', marginTop: 16 }}>
        <span>Don't have an account?{' '}
          <button
            type="button"
            className="link-button"
            onClick={onShowSignup}
            disabled={loading}
          >
            Sign up here
          </button>
        </span>
      </div>
    </div>
  );
};

export default Login;
