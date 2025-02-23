import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faCheckCircle, 
  faExclamationCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import '../styles/auth.css';

const COOLDOWN_TIME = 60; // seconds

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;

      setSuccessMessage('Reset link sent! Check your email inbox.');
      setCooldown(COOLDOWN_TIME);
      setEmail('');
    } catch (error) {
      if (error.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
        setCooldown(COOLDOWN_TIME);
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container forgot-password-container">
      <div className="auth-box forgot-password-box">
        <Link to="/login" className="back-button">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Login
        </Link>

        <div className="auth-header">
          <h1>Reset Password</h1>
          <p className="auth-subtitle">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {error && (
          <div className="error-message">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={error ? 'error' : ''}
              disabled={loading || cooldown > 0}
            />
          </div>

          <button 
            type="submit" 
            className={`submit-button ${loading || cooldown > 0 ? 'disabled' : ''}`}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> 
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Try again in ${cooldown}s`
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 