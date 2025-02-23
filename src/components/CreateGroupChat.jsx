import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Loading from './Loading'
import '../styles/createGroupChat.css'

const CreateGroupChat = ({ onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', (await supabase.auth.getUser()).data.user.id)

      if (error) throw error
      setAvailableUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const renderLoadingPlaceholders = () => {
    return Array(5).fill(0).map((_, index) => (
      <div key={index} className="loading-placeholder" />
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!groupName.trim() || selectedUsers.length === 0) {
      setError('Please enter a group name and select at least one member')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Call the create_group_chat function
      const { data: chatId, error } = await supabase
        .rpc('create_group_chat', {
          group_name: groupName.trim(),
          member_ids: selectedUsers
        })

      if (error) throw error

      // Fetch the created chat details
      const { data: chatData, error: fetchError } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          is_group,
          created_at,
          created_by,
          chat_members (
            user_id,
            profiles (
              id,
              username,
              avatar_url,
              status
            )
          )
        `)
        .eq('id', chatId)
        .single()

      if (fetchError) throw fetchError

      if (onGroupCreated) {
        const processedChat = {
          ...chatData,
          profiles: chatData.chat_members.map(member => member.profiles).filter(Boolean)
        }
        onGroupCreated(processedChat)
      }
      onClose()
    } catch (error) {
      console.error('Error creating group:', error)
      setError(error.message || 'Failed to create group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="create-group-overlay">
      <div className="create-group-modal">
        <h2>Create Group Chat</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading || submitting}
              required
            />
          </div>
          <div className="users-list">
            <h3>Select Members</h3>
            {loading ? (
              <Loading />
            ) : availableUsers.length === 0 ? (
              <div className="no-users">
                <p>No users available to add to the group</p>
              </div>
            ) : (
              availableUsers.map((user) => (
                <div
                  key={user.id}
                  className={`user-item ${
                    selectedUsers.includes(user.id) ? 'selected' : ''
                  }`}
                  onClick={() => !submitting && handleUserToggle(user.id)}
                >
                  <div className="user-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} />
                    ) : (
                      user.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="user-info">
                    <h4>{user.username}</h4>
                  </div>
                  <div className="user-select">
                    {selectedUsers.includes(user.id) ? '✓' : '+'}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading || !groupName.trim() || selectedUsers.length === 0}
            >
              {submitting ? (
                <Loading />
              ) : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroupChat 