import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import '../styles/createGroupChat.css'

const CreateGroupChat = ({ onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAvailableUsers()
  }, [])

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .neq('id', (await supabase.auth.getUser()).data.user.id)

      if (error) throw error
      setAvailableUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    }
  }

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!groupName.trim() || selectedUsers.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Create group chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            name: groupName,
            is_group: true,
            created_by: (await supabase.auth.getUser()).data.user.id
          }
        ])
        .select()
        .single()

      if (chatError) throw chatError

      // Add members to the group
      const members = [
        { chat_id: chatData.id, user_id: chatData.created_by, role: 'admin' },
        ...selectedUsers.map((userId) => ({
          chat_id: chatData.id,
          user_id: userId,
          role: 'member'
        }))
      ]

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(members)

      if (membersError) throw membersError

      if (onGroupCreated) onGroupCreated(chatData)
      onClose()
    } catch (error) {
      console.error('Error creating group:', error)
      setError('Failed to create group')
    } finally {
      setLoading(false)
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
              required
            />
          </div>
          <div className="users-list">
            <h3>Select Members</h3>
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className={`user-item ${
                  selectedUsers.includes(user.id) ? 'selected' : ''
                }`}
                onClick={() => handleUserToggle(user.id)}
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
                  <p>{user.email}</p>
                </div>
                <div className="user-select">
                  {selectedUsers.includes(user.id) ? '✓' : '+'}
                </div>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedUsers.length === 0}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroupChat 