import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../supabaseClient';
import { upsertUser } from '../../../backend/users';
const cprimeLogoSrc = '/cprime-logo.png';
import './Signup.css';

const Signup = ({ onBackToLogin, onSignupSuccess }) => {
  console.log('Signup component rendered');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Email validation for x.y@cprime.com format
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z]+\.[a-zA-Z]+@cprime\.com$/;
    return emailRegex.test(email);
  };

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Email must be in format: firstname.lastname@cprime.com';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    console.log('Signup form submitted');
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: { name: formData.name.trim() }
        }
      });
      console.log('Signup response data:', data);
      if (error) {
        toast.error(error.message || 'Sign up failed. Please try again.');
      } else {
        // Show toast as soon as user is created in auth.users
        console.log('Signup successful, showing toast!');
        toast.success('Sign up successful! Redirecting to login...');
        // Delay closing the signup form to allow toast to show
        setTimeout(() => {
          onSignupSuccess();
        }, 3500); // 3.5 second delay before redirect
      }
    } catch (err) {
      toast.error('Unexpected error during signup.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <img src={cprimeLogoSrc} alt="Cprime Logo" className="signup-logo" />
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
              disabled={loading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="firstname.lastname@cprime.com"
              disabled={loading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter password (min 8 characters)"
                disabled={loading}
                style={{ boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                disabled={loading}
                style={{ boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>
          <button
            type="submit"
            className="signup-button"
            disabled={loading}
            onClick={() => console.log('Signup button clicked')}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="signup-footer">
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              className="link-button" 
              onClick={onBackToLogin}
              disabled={loading}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
