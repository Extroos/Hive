import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { supabase } from '../supabaseClient'
import Loading from './Loading'
import '../styles/createDirectChat.css'

const CreateDirectChat = ({ onClose, onChatCreated }) => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user: currentUser } = useSelector((state) => state.auth)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        user =>
          user.username.toLowerCase().includes(query)
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status, last_seen')
        .neq('id', currentUser.id)
        .order('username')

      if (error) throw error
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = async (selectedUser) => {
    try {
      setLoading(true)

      // First check if a direct chat already exists with this user
      const { data: existingChats, error: checkError } = await supabase
        .from('chats')
        .select(`
          id,
          is_group,
          chat_members!inner (
            user_id,
            profiles (
              id,
              username,
              avatar_url,
              status,
              last_seen
            )
          )
        `)
        .eq('is_group', false)
        .eq('chat_members.user_id', selectedUser.id)

      if (checkError) throw checkError

      // Find a chat where both users are members
      const existingChat = existingChats?.find(chat => 
        chat.chat_members.some(member => member.user_id === currentUser.id)
      )

      let chatData
      if (existingChat) {
        // If chat exists, use it
        chatData = existingChat
      } else {
        // If no chat exists, create a new one
        const { data: newChatId, error: createError } = await supabase.rpc(
          'create_one_on_one_chat',
          { other_user_id: selectedUser.id }
        )

        if (createError) throw createError

        // Fetch the created chat details
        const { data: newChat, error: fetchError } = await supabase
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
                status,
                last_seen
              )
            )
          `)
          .eq('id', newChatId)
          .single()

        if (fetchError) throw fetchError
        chatData = newChat
      }

      // Process the chat data
      const processedChat = {
        ...chatData,
        profiles: chatData.chat_members.map(member => member.profiles).filter(Boolean)
      }

      if (onChatCreated) onChatCreated(processedChat)
      onClose()
    } catch (error) {
      console.error('Error creating/finding chat:', error)
      setError('Failed to create chat')
    } finally {
      setLoading(false)
    }
  }

  const getUserStatus = (user) => {
    if (user.status === 'online') return 'Online'
    if (user.last_seen) {
      const lastSeen = new Date(user.last_seen)
      const now = new Date()
      const diff = now - lastSeen
      
      if (diff < 60000) return 'Just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return lastSeen.toLocaleDateString()
    }
    return 'Offline'
  }

  return (
    <div className="create-direct-overlay">
      <div className="create-direct-modal">
        <h2>Start a Conversation</h2>
        {error && <div className="error">{error}</div>}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="users-list">
          {loading ? (
            <Loading />
          ) : filteredUsers.length === 0 ? (
            <div className="no-users">
              <p>{searchQuery ? 'No users found matching your search' : 'No users found'}</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="user-item"
                onClick={() => handleUserSelect(user)}
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
                  <span className="last-seen">{getUserStatus(user)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateDirectChat 