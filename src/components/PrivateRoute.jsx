import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useAuth } from '../providers/AuthProvider'

const PrivateRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth)
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

export default PrivateRoute 