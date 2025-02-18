import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import ChatItem from './ChatItem'
import '../styles/chatList.css'

const ChatList = ({ chats, selectedChat, onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'unread' | 'name'
  const [newMessageNotif, setNewMessageNotif] = useState(null)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef(null)
  const { profile } = useSelector((state) => state.auth)

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
    const handleNewMessage = (chat) => {
      if (chat.last_message?.sender_id !== profile?.id) {
        const sender = chat.profiles.find(p => p.id === chat.last_message?.sender_id)
        setNewMessageNotif({
          username: sender?.username || 'Someone',
          message: chat.last_message?.content || 'sent you a message'
        })
      }
    }

    // Watch for changes in chats
    chats.forEach(chat => {
      if (chat.last_message && chat.last_message.created_at > chat.last_seen_at) {
        handleNewMessage(chat)
      }
    })
  }, [chats, profile?.id])

  const handleSearchClick = () => {
    setIsSearchExpanded(!isSearchExpanded)
    if (!isSearchExpanded) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 300)
    } else {
      setSearchQuery('')
    }
  }

  const handleClickOutside = useCallback((event) => {
    if (
      isSearchExpanded &&
      !event.target.closest('.search-box') &&
      !searchQuery
    ) {
      setIsSearchExpanded(false)
    }
  }, [isSearchExpanded, searchQuery])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  // Memoized filtered and sorted chats
  const filteredChats = useMemo(() => {
    let filtered = chats.filter(chat => {
      const chatName = chat.is_group 
        ? chat.name 
        : chat.profiles.find(p => p.id !== profile?.id)?.username || 'Unknown User'
      
      return chatName.toLowerCase().includes(searchQuery.toLowerCase())
    })

    switch (sortBy) {
      case 'unread':
        return filtered.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0))
      case 'name':
        return filtered.sort((a, b) => {
          const nameA = a.is_group ? a.name : a.profiles.find(p => p.id !== profile?.id)?.username
          const nameB = b.is_group ? b.name : b.profiles.find(p => p.id !== profile?.id)?.username
          return nameA?.localeCompare(nameB)
        })
      case 'recent':
      default:
        return filtered.sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at
          const timeB = b.last_message?.created_at || b.created_at
          return new Date(timeB) - new Date(timeA)
        })
    }
  }, [chats, searchQuery, sortBy, profile?.id])

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
      {newMessageNotif && (
        <div className="new-message-notification">
          <span className="notification-content">
            {newMessageNotif.username}: {newMessageNotif.message}
          </span>
        </div>
      )}

      <div className="chat-list-header">
        <div className={`search-box ${isSearchExpanded ? 'expanded' : ''}`}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSearchExpanded(false)
                setSearchQuery('')
              }
            }}
          />
          <div className="search-icon" onClick={handleSearchClick} />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="sort-options">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort chats by"
          >
            <option value="recent">Recent</option>
            <option value="unread">Unread</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div className="no-results">
            <p>No chats found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
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
    </div>
  )
}

export default React.memo(ChatList) 