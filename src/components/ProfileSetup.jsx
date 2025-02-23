import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { supabase } from '../supabaseClient'
import '../styles/profileSetup.css'

const ProfileSetup = ({ user, onComplete }) => {
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const dispatch = useDispatch()

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatar(file)
      setAvatarUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Nickname is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      let avatar_url = null
      if (avatar) {
        const fileExt = avatar.name.split('.').pop()
        const filePath = `${user.id}.${fileExt}`

        // Upload avatar to storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatar, {
            upsert: true,
            cacheControl: '3600',
            contentType: avatar.type
          })

        if (uploadError) {
          console.error('Error uploading avatar:', uploadError)
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatar_url = publicUrl
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: nickname,
          avatar_url,
          has_completed_setup: true
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        throw updateError
      }

      // Update Redux store
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          username: nickname,
          avatar_url,
          has_completed_setup: true
        }
      })

      if (onComplete) onComplete()
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <h2>Complete Your Profile</h2>
        <p>Please set up your nickname and profile picture to continue</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <div className="avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" />
              ) : (
                <div className="avatar-placeholder">
                  {nickname ? nickname[0]?.toUpperCase() : '?'}
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              id="avatar-input"
              className="hidden"
            />
            <label htmlFor="avatar-input" className="upload-button">
              Choose Profile Picture
            </label>
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading || !nickname.trim()}>
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetup 