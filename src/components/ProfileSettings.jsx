import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { supabase } from '../supabaseClient'
import '../styles/profileSettings.css'

const ProfileSettings = ({ onClose }) => {
  const { user, profile } = useSelector((state) => state.auth)
  const [nickname, setNickname] = useState(profile?.username || '')
  const [avatar, setAvatar] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [status, setStatus] = useState(profile?.status || 'online')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState(profile?.avatar_url || null)
  const dispatch = useDispatch()

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
      setPreviewUrl(profile.avatar_url)
    }
  }, [profile])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB')
        return
      }

      setAvatar(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
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
      setSuccessMessage('')

      let avatar_url = profile?.avatar_url
      if (avatar) {
        try {
          // Delete old avatar if exists
          if (profile?.avatar_url) {
            const oldAvatarPath = profile.avatar_url.split('/').pop()
            console.log('Deleting old avatar:', oldAvatarPath)
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldAvatarPath])
            
            if (deleteError) {
              console.warn('Error deleting old avatar:', deleteError)
              // Continue anyway as this is not critical
            }
          }

          // Upload new avatar
          const fileExt = avatar.name.split('.').pop()
          const fileName = `${user.id}_${Date.now()}.${fileExt}`
          console.log('Uploading new avatar:', fileName)

          const { error: uploadError, data } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatar, {
              upsert: true,
              cacheControl: '0',
              contentType: avatar.type
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error('Failed to upload avatar: ' + uploadError.message)
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

          console.log('New avatar URL:', publicUrl)
          avatar_url = publicUrl
        } catch (uploadError) {
          console.error('Avatar upload failed:', uploadError)
          throw new Error('Failed to upload avatar. Please try again.')
        }
      }

      // Update profile
      console.log('Updating profile with:', {
        username: nickname,
        avatar_url,
        status
      })

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          username: nickname,
          avatar_url,
          status
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error(
          updateError.code === '23505' 
            ? 'This username is already taken. Please choose another one.'
            : 'Failed to update profile: ' + updateError.message
        )
      }

      console.log('Profile updated successfully:', updatedProfile)

      // Update Redux store
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: updatedProfile
      })

      setSuccessMessage('Profile updated successfully!')
      
      // Clean up preview URL
      if (previewUrl && previewUrl !== profile?.avatar_url) {
        URL.revokeObjectURL(previewUrl)
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Profile update failed:', error)
      setError(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Clean up preview URL if it was created for a new avatar
    if (previewUrl && previewUrl !== profile?.avatar_url) {
      URL.revokeObjectURL(previewUrl)
    }
    onClose()
  }

  return (
    <div className="profile-settings-overlay" onClick={handleCancel}>
      <div className="profile-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-settings-header">
          <h2>Profile Settings</h2>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="avatar-section">
            <div className="avatar-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {nickname ? nickname[0]?.toUpperCase() : '?'}
                </div>
              )}
              <div className="avatar-overlay">
                <label htmlFor="avatar-input" className="avatar-edit-button">
                  Change Photo
                </label>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              id="avatar-input"
              className="hidden"
            />
          </div>

          <div className="form-group">
            <label>Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              required
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="profile-actions">
            <button 
              type="button" 
              onClick={handleCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={loading || !nickname.trim()}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileSettings