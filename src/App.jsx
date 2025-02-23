import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Chat from './pages/Chat'
import PrivateRoute from './components/PrivateRoute'
import { SupabaseProvider } from './contexts/SupabaseContext.jsx'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <SupabaseProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
      </Routes>
    </SupabaseProvider>
  )
}

export default App 