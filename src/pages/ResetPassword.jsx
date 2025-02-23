import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/auth.css'; // Ensure to include your styles

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Try to get token from different possible locations
        let token = null;

        // 1. Try URL search params
        const searchParams = new URLSearchParams(location.search);
        token = searchParams.get('token') || searchParams.get('access_token');

        // 2. Try hash fragment if token not found in search params
        if (!token && location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          token = hashParams.get('access_token');
        }

        // 3. Try to parse the entire hash
        if (!token && location.hash) {
          const hashSegments = location.hash.substring(1).split('&');
          const tokenSegment = hashSegments.find(segment => 
            segment.startsWith('access_token=') || segment.startsWith('token=')
          );
          if (tokenSegment) {
            token = tokenSegment.split('=')[1];
          }
        }

        console.log('URL Search:', location.search);
        console.log('URL Hash:', location.hash);
        console.log('Found token:', token ? 'Yes' : 'No');

        if (!token) {
          console.error('No access token found in URL');
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        // Try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        // If we have a token, consider it valid
        setIsTokenValid(true);
        setError(null);

      } catch (error) {
        console.error('Error during password reset:', error);
        setError('An error occurred. Please try again or request a new password reset link.');
      }
    };

    handlePasswordReset();
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isTokenValid) {
      setError('Please request a new password reset link.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccessMessage('Your password has been reset successfully!');
      setNewPassword('');
      
      // Navigate to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Reset Password</h1>
        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        {isTokenValid && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="new-password"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            </div>
            <button type="submit" className="login-button">
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 