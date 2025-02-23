import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import ChatItem from './ChatItem'
import '../styles/chatList.css'

const ChatList = ({ chats = [], selectedChat, onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessageNotif, setNewMessageNotif] = useState(null)
  const searchInputRef = useRef(null)
  const { profile } = useSelector((state) => state.auth)
  const searchBoxRef = useRef(null)

  // Handle new message notifications
  useEffect(() => {
    if (newMessageNotif) {
      const timer = setTimeout(() => {
        setNewMessageNotif(null)
      }, 3000) // Hide notification after 3 seconds
      return () => clearTimeout(timer)
    }
  }, [newMessageNotif])

  // Watch for new messages and update notification
  useEffect(() => {
    if (!Array.isArray(chats)) return;

    const handleNewMessage = (chat) => {
      if (chat.last_message?.sender_id !== profile?.id) {
        const sender = chat.profiles?.find(p => p.id === chat.last_message?.sender_id)
        setNewMessageNotif({
          username: sender?.username || 'Someone',
          message: chat.last_message?.content || 'sent you a message'
        })
      }
    }

    chats.forEach(chat => {
      if (chat?.last_message && chat?.last_message.created_at > chat?.last_seen_at) {
        handleNewMessage(chat)
      }
    })
  }, [chats, profile?.id])

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  // Clear search and focus input
  const handleClearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  // Filter chats
  const filteredChats = useMemo(() => {
    let filtered = chats.filter(chat => {
      const searchLower = searchQuery.toLowerCase()
      const chatName = chat.is_group 
        ? chat.name?.toLowerCase() 
        : chat.profiles.find(p => p.id !== profile?.id)?.username?.toLowerCase()
      
      return !searchQuery || chatName?.includes(searchLower)
    })

    // Sort by most recent message by default
    return filtered.sort((a, b) => 
      new Date(b.last_message?.created_at || b.created_at) - 
      new Date(a.last_message?.created_at || a.created_at)
    )
  }, [chats, searchQuery, profile?.id])

  if (!Array.isArray(chats)) {
    return (
      <div className="chat-list-error">
        <p>Error loading chats</p>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="no-chats">
        <p>No conversations yet</p>
        <p>Start a new chat by clicking the buttons above</p>
      </div>
    )
  }

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <div className={`search-box ${searchQuery ? 'has-text' : ''}`}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div className="no-chats">
            {searchQuery ? (
              <>
                <p>No chats found matching "{searchQuery}"</p>
                <p>Try a different search term or start a new chat</p>
              </>
            ) : (
              <>
                <p>No conversations yet</p>
                <p>Start a new chat to begin messaging</p>
              </>
            )}
          </div>
        ) : (
          filteredChats.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChat?.id === chat.id}
              onClick={() => onChatSelect(chat)}
              currentUserId={profile?.id}
            />
          ))
        )}
      </div>

      {newMessageNotif && (
        <div className="new-message-notification">
          <div className="notification-content">
            <span>New message in {newMessageNotif.username}: {newMessageNotif.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(ChatList) 