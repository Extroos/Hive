import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../styles/auth.css'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate('/')
    }
  }, [user, navigate])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Register the user with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username
          }
        }
      })

      if (authError) throw authError

      // Show email confirmation message
      setEmailSent(true)
    } catch (error) {
      setError(error.message)
      setEmailSent(false)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <div className="confirmation-message">
            <h2>Check your email</h2>
            <p>We've sent a confirmation link to:</p>
            <div className="email-highlight">{email}</div>
            <div className="confirmation-tips">
              <p>Tips:</p>
              <ul>
                <li>Check your spam folder if you don't see the email</li>
                <li>The confirmation link will expire in 24 hours</li>
                <li>Click the link in the email to verify your account</li>
                <li>After verification, you'll be redirected to complete your profile</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Create Account</h1>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register 