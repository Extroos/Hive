import React, { useMemo } from 'react'
import '../styles/chatItem.css'

const ChatItem = ({ chat, isSelected, onClick, currentUserId }) => {
  // Memoize chat name and avatar to prevent unnecessary recalculations
  const { chatName, chatAvatar, otherUser } = useMemo(() => {
    if (chat.is_group) {
      return {
        chatName: chat.name || 'Unnamed Group',
        chatAvatar: null,
        otherUser: null
      }
    }

    const other = chat.profiles.find(p => p.id !== currentUserId)
    return {
      chatName: other?.username || 'Unknown User',
      chatAvatar: other?.avatar_url,
      otherUser: other
    }
  }, [chat, currentUserId])

  // Format the last message preview
  const messagePreview = useMemo(() => {
    const lastMessage = chat.last_message
    if (!lastMessage) return 'No messages yet'

    const isOwnMessage = lastMessage.sender_id === currentUserId
    const prefix = isOwnMessage ? 'You: ' : ''

    switch (lastMessage.type) {
      case 'image':
        return `${prefix}📷 Image`
      case 'document':
        return `${prefix}📎 Document`
      default:
        const content = lastMessage.content.length > 30
          ? `${lastMessage.content.substring(0, 30)}...`
          : lastMessage.content
        return `${prefix}${content}`
    }
  }, [chat.last_message, currentUserId])

  // Format the time
  const formattedTime = useMemo(() => {
    const timestamp = chat.last_message?.created_at || chat.created_at
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }, [chat.last_message?.created_at, chat.created_at])

  return (
    <div 
      className={`chat-item ${isSelected ? 'selected' : ''} ${chat.unread_count ? 'unread' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="chat-avatar">
        {chat.is_group ? (
          <div className="group-avatar">
            <span>👥</span>
            {chat.chat_members?.length > 0 && (
              <span className="member-count">{chat.chat_members.length}</span>
            )}
          </div>
        ) : (
          <>
            {chatAvatar ? (
              <img src={chatAvatar} alt={chatName} />
            ) : (
              <div className="avatar-placeholder">
                {chatName[0]?.toUpperCase() || '?'}
              </div>
            )}
            {otherUser && (
              <span 
                className={`status-dot ${otherUser.status || 'offline'}`}
                title={otherUser.status || 'offline'}
              />
            )}
          </>
        )}
      </div>

      <div className="chat-details">
        <div className="chat-header">
          <h3 className="chat-name">{chatName}</h3>
          <span className="chat-time">{formattedTime}</span>
        </div>

        <div className="chat-preview">
          <p className="last-message">
            {messagePreview}
          </p>
          {chat.unread_count > 0 && (
            <span className="unread-count" aria-label={`${chat.unread_count} unread messages`}>
              {chat.unread_count}
            </span>
          )}
        </div>

        {chat.typing_users?.length > 0 && (
          <div className="typing-indicator">
            <span>typing</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(ChatItem) 